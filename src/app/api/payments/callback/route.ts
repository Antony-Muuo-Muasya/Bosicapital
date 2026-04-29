export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePath } from 'next/cache';
import { sendSMS } from '@/lib/sms';
import { pusher } from '@/lib/pusher';


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
    // Strategy: Account Number (National ID) → Phone Number
    // ---------------------------------------------------
    let loan: any = null;
    let borrower: any = null;
    let isRegistrationFee = false;

    // A. Match by Account Number (provided by user in the field Safaricom calls BillRefNumber)
    if (BillRefNumber) {
      const rawAccount = BillRefNumber.trim();
      const cleanedAccount = rawAccount.toUpperCase().replace(/[\s\-]/g, ""); // "123 456" -> "123456"
      const numericAccount = rawAccount.replace(/[^0-9]/g, ""); // "ID123" -> "123"

      console.log(`[M-Pesa] Account Number received: raw="${rawAccount}" cleaned="${cleanedAccount}" numeric="${numericAccount}"`);

      // Try matching against National ID
      try {
        const bByNational = await db(
          `SELECT * FROM "Borrower" WHERE REGEXP_REPLACE("nationalId", '[^0-9A-Za-z]', '', 'g') ILIKE $1 OR REGEXP_REPLACE("nationalId", '[^0-9]', '', 'g') = $2`,
          [cleanedAccount, numericAccount]
        );
        if (bByNational.length > 0) {
          borrower = bByNational[0];
          console.log(`[M-Pesa] Found Borrower by National ID Match: ${borrower.id}`);

          // Find the most recent relevant loan for this borrower
          const lByBorrower = await db(
            `SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status IN ('Active', 'Approved', 'Pending Approval') ORDER BY "issueDate" DESC LIMIT 1`,
            [borrower.id]
          );
          if (lByBorrower.length > 0) {
            loan = lByBorrower[0];
            console.log(`[M-Pesa] Automatically linked to Loan: ${loan.id}`);
          }
        }
      } catch (e: any) { console.error("[M-Pesa] National ID matching error:", e.message); }
    }

    // B. Fallback: Match by Phone number (MSISDN)
    if (!loan && !borrower && MSISDN) {
      const phoneRaw = MSISDN.replace(/[^0-9]/g, "");
      // Support various formats: 07..., 2547..., 7...
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
          console.log(`[M-Pesa] Found Borrower by Phone Fallback: ${borrower.id}`);

          const lByBorrower = await db(
            `SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status IN ('Active', 'Approved', 'Pending Approval') ORDER BY "issueDate" DESC LIMIT 1`,
            [borrower.id]
          );
          if (lByBorrower.length > 0) {
            loan = lByBorrower[0];
            console.log(`[M-Pesa] Automatically linked to Loan via phone: ${loan.id}`);
          }
        }
      } catch (e: any) { console.error("[M-Pesa] Phone matching error:", e.message); }
    }

    // C. Check for Registration Fee Payment
    if (!loan && borrower && borrower.registrationFeePaid === false && borrower.registrationFeeRequired !== false) {
      // If we found a borrower but no loan, check if they are paying registration fee
      // Usually the registration fee is a specific amount, but we accept any payment as registration if they haven't paid it yet and have no active loan
      console.log(`[M-Pesa] Borrower ${borrower.id} found but no active loan. Treating as Registration Fee payment.`);
      isRegistrationFee = true;
    }

    // ---------------------------------------------------
    // Step 4: Process payment or log failure
    // ---------------------------------------------------
    if (isRegistrationFee && borrower) {
      try {
        const regId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const now = new Date().toISOString();

        // 1. Log Registration Payment
        await db(`
          INSERT INTO "RegistrationPayment" (id, "organizationId", "borrowerId", amount, "paymentMethod", reference, "collectedBy", "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [regId, borrower.organizationId, borrower.id, paymentAmount, 'Mobile Money', TransID, 'mpesa_system', now]);

        // 2. Update Borrower
        await db(`
          UPDATE "Borrower"
          SET "registrationFeePaid" = true,
              "registrationFeePaidAt" = $2,
              "registrationPaymentId" = $3
          WHERE id = $1
        `, [borrower.id, now, regId]);

        await db(`UPDATE "MpesaCallback" SET status = 'Processed', "errorMessage" = 'Registration Fee' WHERE id = $1`, [mpesaId]);
        console.log(`[M-Pesa] ✅ Registration Fee processed: ${regId}, KES ${paymentAmount}, Borrower: ${borrower.id}`);

        // SMS Confirmation for Registration
        try {
          const firstName = borrower.fullName?.split(' ')[0] || FirstName || 'Customer';
          const smsMessage = `Hello ${firstName}, we have received your Registration Fee of KES ${paymentAmount}. Receipt: ${TransID}. Your registration is now complete. Thank you for choosing Bosi Capital.`;
          await sendSMS(MSISDN || '', smsMessage);
        } catch (smsErr: any) { console.error("[M-Pesa] SMS failure:", smsErr.message); }

        // Pusher Trigger for real-time update
        try {
          await pusher.trigger('repayments-channel', 'new-payment', {
            borrowerName: borrower.fullName,
            amount: paymentAmount,
            type: 'Registration Fee'
          });
        } catch (pErr: any) { console.error("[Pusher] trigger error:", pErr.message); }

        revalidatePath('/borrowers');
        revalidatePath('/borrowers/' + borrower.id);

      } catch (regErr: any) {
        console.error("[M-Pesa] Error processing registration fee:", regErr.message);
        await db(`UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = $2 WHERE id = $1`, [mpesaId, regErr.message]);
      }
    } 
    else if (loan && borrower) {
      try {
        // Apply payment to installments (oldest first)
        const unpaid = await db(
          `SELECT * FROM "Installment" WHERE "loanId" = $1 AND status IN ('Unpaid', 'Partial', 'Overdue') ORDER BY "dueDate" ASC`,
          [loan.id]
        );

        let remaining = paymentAmount;
        if (unpaid.length > 0) {
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
        } else {
           console.log(`[M-Pesa] No unpaid installments for loan ${loan.id}. Excess payment of ${remaining} will be logged.`);
        }

        // Recalculate loan balance and status
        const totals = await db(
          `SELECT COALESCE(SUM("paidAmount"), 0) as paid FROM "Installment" WHERE "loanId" = $1`,
          [loan.id]
        );
        const totalPaid = Number(totals[0]?.paid || 0);
        const balance = Math.max(0, Number(loan.totalPayable) - totalPaid);
        const newStatus = balance <= 0 ? "Completed" : (loan.status === 'Approved' ? 'Active' : loan.status);

        await db(
          `UPDATE "Loan" SET "status" = $2, "lastPaymentDate" = $3 WHERE id = $1`,
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

        // Cache revalidation
        revalidatePath('/repayments');
        revalidatePath('/dashboard');
        revalidatePath(`/loans/${loan.id}`);
        revalidatePath('/borrowers/' + borrower.id);

        // Send SMS Confirmation
        try {
          const firstName = borrower.fullName?.split(' ')[0] || FirstName || 'Customer';
          const smsMessage = `Hello ${firstName}, we have received your payment of KES ${paymentAmount}. Receipt: ${TransID}. Your new loan balance is KES ${balance}. Thank you for choosing Bosi Capital.`;
          await sendSMS(MSISDN || '', smsMessage);
        } catch (smsErr: any) { console.error("[M-Pesa] SMS failure:", smsErr.message); }

        // Pusher Trigger for real-time update
        try {
          await pusher.trigger('repayments-channel', 'new-payment', {
            borrowerName: borrower.fullName,
            amount: paymentAmount,
            type: 'Loan Repayment'
          });
        } catch (pErr: any) { console.error("[Pusher] trigger error:", pErr.message); }


      } catch (processErr: any) {
        console.error("[M-Pesa] Error processing payment:", processErr.message);
        try {
          await db(`UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = $2 WHERE id = $1`, [mpesaId, processErr.message]);
        } catch { /* ignore */ }
      }
    } else {
      // No match found — log it clearly for debugging
      const errorMsg = `Could not match loan/borrower. BillRef="${BillRefNumber}", MSISDN="${MSISDN}", TransID="${TransID}". Tip: ensure borrower's National ID or Loan ID matches the BillRefNumber.`;
      console.warn(`[M-Pesa] ⚠️ ${errorMsg}`);
      try {
        await db(
          `UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = $2 WHERE id = $1`,
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
