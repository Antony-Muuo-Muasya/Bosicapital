export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePath } from 'next/cache';
import { sendSMS } from '@/lib/sms';

// -------------------------------------------------------
// Safaricom C2B Production Confirmation Callback Structure:
// {
//   "TransactionType": "Pay Bill",
//   "TransID": "RGH3F...",
//   "TransTime": "20240101123456",
//   "TransAmount": "100.00",
//   "BusinessShortCode": "4159879",
//   "BillRefNumber": "LOANID123",
//   "InvoiceNumber": "",
//   "OrgAccountBalance": "0.00",
//   "ThirdPartyTransID": "",
//   "MSISDN": "2547XXXXXXXX",
//   "FirstName": "John",
//   "MiddleName": "",
//   "LastName": "Doe"
// }
// -------------------------------------------------------

interface MpesaCallbackData {
  TransactionType?: string;
  TransID?: string;
  TransTime?: string;
  TransAmount?: string;
  BusinessShortCode?: string;
  BillRefNumber?: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

function normalizePhoneNumber(msisdn: string): string {
  if (msisdn.startsWith("254") && msisdn.length === 12) {
    return "0" + msisdn.substring(3);
  }
  if (msisdn.startsWith("+254")) {
    return "0" + msisdn.substring(4);
  }
  return msisdn;
}

// -------------------------------------------------------
// GET: Health check + Safaricom Validation endpoint
// Safaricom hits this URL for BOTH validation (GET-like) and 
// confirmation (POST). Returning ResultCode: 0 = accept.
// -------------------------------------------------------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const hasValidationParams =
    url.searchParams.has("TransactionType") ||
    url.searchParams.has("TransID") ||
    url.searchParams.has("BillRefNumber");

  if (hasValidationParams) {
    // Safaricom validation call — always accept
    console.log("[M-Pesa Validation] GET validation hit:", url.searchParams.toString());
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  // Health check
  try {
    const dbTest = await db(`SELECT 1 as ok`, []);
    return NextResponse.json({
      message: "Callback endpoint is active and reachable.",
      database: dbTest.length > 0 ? "Connected" : "Not connected"
    });
  } catch (e: any) {
    return NextResponse.json({
      message: "Callback endpoint is active, but DATABASE is NOT connected.",
      error: e.message
    }, { status: 500 });
  }
}

// -------------------------------------------------------
// POST: Safaricom Confirmation callback
// -------------------------------------------------------
export async function POST(req: Request) {
  let rawBody = '';
  try {
    rawBody = await req.text();
    console.log("[M-Pesa Webhook] Raw payload received:", rawBody);

    let callbackData: MpesaCallbackData = {};
    try {
      const parsed = JSON.parse(rawBody);
      // C2B paybill sends flat JSON. STK push sends nested Body.stkCallback — ignore those.
      if (parsed?.Body?.stkCallback) {
        console.log("[M-Pesa Webhook] Received STK push callback, ignoring.");
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }
      callbackData = parsed;
    } catch {
      console.error("[M-Pesa Webhook] Failed to parse JSON body:", rawBody);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const {
      TransID, BillRefNumber, MSISDN, TransAmount, TransTime,
      BusinessShortCode, FirstName, MiddleName, LastName, TransactionType
    } = callbackData;

    console.log(`[M-Pesa Webhook] Parsed: TransID=${TransID}, Amount=${TransAmount}, BillRef=${BillRefNumber}, MSISDN=${MSISDN}`);

    // If no TransID, accept gracefully (could be a validation ping)
    if (!TransID) {
      console.warn("[M-Pesa Webhook] No TransID in payload. Accepting.");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const paymentAmount = parseFloat(TransAmount || "0");
    const mpesaId = `mpc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      console.warn("[M-Pesa Webhook] Invalid amount:", TransAmount);
      try {
        await db(
          `INSERT INTO "MpesaCallback" (id, "transId", "billRefNumber", msisdn, "transAmount", status, "errorMessage")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT ("transId") DO NOTHING`,
          [mpesaId, TransID, BillRefNumber || '', MSISDN || '', TransAmount || '0', "Failed", "Invalid amount"]
        );
      } catch (dbErr) {
        console.error("[M-Pesa] DB log error:", dbErr);
      }
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // ---------------------------------------------------
    // Step 1: Check for duplicate transaction FIRST
    // (to avoid processing the same payment twice)
    // ---------------------------------------------------
    try {
      const existing = await db(`SELECT id FROM "Repayment" WHERE "transId" = $1`, [TransID]);
      if (existing.length > 0) {
        console.log(`[M-Pesa] Duplicate TransID: ${TransID}. Skipping.`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }
    } catch (dupErr: any) {
      console.error("[M-Pesa] Duplicate check error:", dupErr.message);
    }

    // ---------------------------------------------------
    // Step 2: Log the callback
    // ---------------------------------------------------
    try {
      await db(
        `INSERT INTO "MpesaCallback" (
          id, "transId", "billRefNumber", msisdn, "transAmount", "transTime",
          "businessShortCode", "firstName", "middleName", "lastName", status, "transactionType"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT DO NOTHING`,
        [
          mpesaId, TransID, BillRefNumber || '', MSISDN || '',
          TransAmount, TransTime || '', BusinessShortCode || '',
          FirstName || '', MiddleName || '', LastName || '', "Pending", TransactionType || ''
        ]
      );
    } catch (logErr: any) {
      console.error("[M-Pesa] Failed to log callback. DB error:", logErr.message);
      // Continue even if logging fails — don't block payment processing
    }

    // ---------------------------------------------------
    // Step 3: Match borrower and loan
    // Strategy: BillRefNumber → Loan ID → National ID → Phone
    // ---------------------------------------------------
    let loan: any = null;
    let borrower: any = null;

    // 3A. Match by BillRefNumber → Loan ID
    if (BillRefNumber) {
      const cleanedRef = BillRefNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      
      // Try exact loan ID match (case-insensitive)
      try {
        const lById = await db(
          `SELECT l.*, b."fullName", b.phone as "borrowerPhone", b.email as "borrowerEmail", b.id as "bId"
           FROM "Loan" l JOIN "Borrower" b ON l."borrowerId" = b.id
           WHERE UPPER(REPLACE(l.id, ' ', '')) = $1 AND l.status = 'Active'`,
          [cleanedRef]
        );
        if (lById.length > 0) {
          loan = lById[0];
          borrower = { ...lById[0], id: lById[0].bId };
          console.log(`[M-Pesa] Matched by Loan ID: ${loan.id}`);
        }
      } catch (e: any) { console.error("[M-Pesa] Loan ID match error:", e.message); }

      // 3B. If not found by loan ID, try National ID
      if (!loan) {
        try {
          const bByNational = await db(
            `SELECT * FROM "Borrower" WHERE REPLACE("nationalId", ' ', '') = $1`,
            [cleanedRef]
          );
          if (bByNational.length > 0) {
            borrower = bByNational[0];
            const lByBorrower = await db(
              `SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`,
              [borrower.id]
            );
            if (lByBorrower.length > 0) {
              loan = lByBorrower[0];
              console.log(`[M-Pesa] Matched by National ID: ${cleanedRef}`);
            }
          }
        } catch (e: any) { console.error("[M-Pesa] National ID match error:", e.message); }
      }
    }

    // 3C. Fallback: match by phone number (MSISDN)
    if (!loan && MSISDN) {
      const phoneRaw = MSISDN.replace(/[^0-9]/g, "");
      const phone0 = phoneRaw.startsWith("254") ? "0" + phoneRaw.slice(3) : 
                     phoneRaw.startsWith("0") ? phoneRaw : "0" + phoneRaw;
      const phone254 = phoneRaw.startsWith("254") ? phoneRaw : "254" + phoneRaw.replace(/^0/, "");
      
      try {
        const bByPhone = await db(
          `SELECT * FROM "Borrower" WHERE phone IN ($1, $2, $3, $4, $5)`,
          [phone0, MSISDN, phoneRaw, phone254, "+" + phone254]
        );
        if (bByPhone.length > 0) {
          borrower = bByPhone[0];
          const lByBorrower = await db(
            `SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`,
            [borrower.id]
          );
          if (lByBorrower.length > 0) {
            loan = lByBorrower[0];
            console.log(`[M-Pesa] Matched by Phone: ${phone0}`);
          }
        }
      } catch (e: any) { console.error("[M-Pesa] Phone match error:", e.message); }
    }

    // ---------------------------------------------------
    // Step 4: Process payment or log failure
    // ---------------------------------------------------
    if (loan && borrower) {
      try {
        // Apply payment to installments (oldest first)
        const unpaid = await db(
          `SELECT * FROM "Installment" WHERE "loanId" = $1 AND status IN ('Unpaid', 'Partial', 'Overdue') ORDER BY "dueDate" ASC`,
          [loan.id]
        );

        let remaining = paymentAmount;
        for (const inst of unpaid) {
          if (remaining <= 0) break;
          const due = Number(inst.expectedAmount) - Number(inst.paidAmount);
          if (remaining >= due) {
            await db(
              `UPDATE "Installment" SET "paidAmount" = $2, status = 'Paid' WHERE id = $1`,
              [inst.id, inst.expectedAmount]
            );
            remaining -= due;
          } else {
            await db(
              `UPDATE "Installment" SET "paidAmount" = "paidAmount" + $2, status = 'Partial' WHERE id = $1`,
              [inst.id, remaining]
            );
            remaining = 0;
          }
        }

        // Recalculate loan balance and status
        const totals = await db(
          `SELECT COALESCE(SUM("paidAmount"), 0) as paid FROM "Installment" WHERE "loanId" = $1`,
          [loan.id]
        );
        const totalPaid = Number(totals[0]?.paid || 0);
        const balance = Number(loan.totalPayable) - totalPaid;
        const newStatus = balance <= 0 ? "Completed" : "Active";

        await db(
          `UPDATE "Loan" SET status = $2, "lastPaymentDate" = $3 WHERE id = $1`,
          [loan.id, newStatus, new Date().toISOString()]
        );

        // Insert repayment record
        const repId = `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        await db(
          `INSERT INTO "Repayment" (
            id, "organizationId", "loanId", "loanOfficerId", "borrowerId", "transId",
            amount, "paymentDate", "collectedById", method, phone, "balanceAfterPayment"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            repId,
            loan.organizationId,
            loan.id,
            loan.loanOfficerId || 'mpesa_system',
            borrower.id,
            TransID,
            paymentAmount,
            new Date().toISOString(),
            'mpesa_system',
            'Mobile Money',
            MSISDN || '',
            balance
          ]
        );

        await db(`UPDATE "MpesaCallback" SET status = 'Processed' WHERE id = $1`, [mpesaId]);
        console.log(`[M-Pesa] ✅ Payment processed: ${repId}, KES ${paymentAmount}, Loan: ${loan.id}`);

        // Pusher real-time notification (optional)
        if (
          process.env.PUSHER_APP_ID &&
          process.env.PUSHER_APP_ID !== 'YOUR_PUSHER_APP_ID' &&
          process.env.NEXT_PUBLIC_PUSHER_KEY &&
          process.env.NEXT_PUBLIC_PUSHER_KEY !== 'YOUR_PUSHER_KEY'
        ) {
          try {
            const Pusher = (await import('pusher')).default;
            const pusher = new Pusher({
              appId: process.env.PUSHER_APP_ID!,
              key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
              secret: process.env.PUSHER_SECRET!,
              cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
              useTLS: true,
            });
            await pusher.trigger('repayments-channel', 'new-payment', {
              message: 'New payment received',
              amount: paymentAmount,
              borrowerName: borrower.fullName || `${FirstName || ''} ${LastName || ''}`.trim() || 'Customer',
              loanId: loan.id
            });
          } catch (pusherError) {
            console.error("[Pusher] Error triggering event:", pusherError);
          }
        }

        // Cache revalidation so Next.js refreshes server-rendered pages
        revalidatePath('/repayments');
        revalidatePath('/dashboard');
        revalidatePath(`/loans/${loan.id}`);
        revalidatePath('/borrowers');
        revalidatePath('/borrowers/' + borrower.id);

        // Send SMS Confirmation
        try {
          const firstName = borrower.fullName?.split(' ')[0] || FirstName || 'Customer';
          const smsMessage = `Hello ${firstName}, we have received your payment of KES ${paymentAmount}. Receipt: ${TransID}. Your new loan balance is KES ${balance}. Thank you for choosing Bosi Capital.`;
          await sendSMS(MSISDN || '', smsMessage);
        } catch (smsErr: any) {
          console.error("[M-Pesa Webhook] SMS failure:", smsErr.message);
        }

      } catch (processErr: any) {
        console.error("[M-Pesa] Error processing payment:", processErr.message);
        try {
          await db(
            `UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = $2 WHERE id = $1`,
            [mpesaId, processErr.message]
          );
        } catch { /* ignore */ }
      }
    } else {
      // No match found — log it clearly for debugging
      const errorMsg = `No loan/borrower match. BillRef="${BillRefNumber}", MSISDN="${MSISDN}", TransID="${TransID}"`;
      console.warn(`[M-Pesa] ⚠️ ${errorMsg}`);
      try {
        await db(
          `UPDATE "MpesaCallback" SET status = 'Unmatched', "errorMessage" = $2 WHERE id = $1`,
          [mpesaId, errorMsg]
        );
      } catch { /* ignore */ }
    }

    // Always respond 200 to stop Safaricom retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (e: any) {
    console.error("[M-Pesa Webhook] Critical Error:", e.message, "Raw:", rawBody);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
