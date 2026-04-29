import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.log("[M-Pesa STK Callback] Raw body received:", rawBody);

    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      console.warn("[M-Pesa STK Callback] Could not parse body — returning OK to Safaricom");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const stk = parsed?.Body?.stkCallback;
    if (!stk) {
      console.warn("[M-Pesa STK Callback] No stkCallback in body");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const checkoutID = stk.CheckoutRequestID;
    
    // If payment was cancelled or failed
    if (stk.ResultCode !== 0) {
      console.log(`[M-Pesa STK Callback] Payment not completed. Code: ${stk.ResultCode}, Desc: ${stk.ResultDesc}`);
      if (checkoutID) {
        await db(`UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = $2 WHERE "checkoutRequestId" = $1`, 
          [checkoutID, stk.ResultDesc || "User cancelled or failed"]
        ).catch(() => {});
      }
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Extract metadata
    const metaItems: any[] = stk.CallbackMetadata?.Item || [];
    let amount = 0, mpesaReceipt = "", phone = "", transTime = "";

    for (const item of metaItems) {
      if (item.Name === "Amount") amount = Number(item.Value);
      if (item.Name === "MpesaReceiptNumber") mpesaReceipt = String(item.Value);
      if (item.Name === "PhoneNumber") phone = String(item.Value);
      if (item.Name === "TransactionDate") transTime = String(item.Value);
    }

    console.log("[M-Pesa STK Callback] Parsed:", { amount, mpesaReceipt, phone, transTime, checkoutID });

    if (!mpesaReceipt) {
      console.warn("[M-Pesa STK Callback] No MpesaReceiptNumber found");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 1. Duplicate check
    const existing = await db(`SELECT id FROM "Repayment" WHERE "transId" = $1`, [mpesaReceipt]);
    if (existing.length > 0) {
      console.log("[M-Pesa STK Callback] Already processed:", mpesaReceipt);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 2. Log/Update callback record
    try {
      if (checkoutID) {
        // Update the record created during STK Initiation
        await db(
          `UPDATE "MpesaCallback" 
           SET "transId" = $1, msisdn = $2, "transAmount" = $3, "transTime" = $4, status = 'Pending'
           WHERE "checkoutRequestId" = $5`,
          [mpesaReceipt, phone, String(amount), transTime, checkoutID]
        );
      } else {
        const mpesaId = `mpc_${Date.now()}_stk`;
        await db(
          `INSERT INTO "MpesaCallback" (id, "transId", msisdn, "transAmount", "transTime", status, "transactionType")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [mpesaId, mpesaReceipt, phone, String(amount), transTime, "Pending", "STK Push"]
        );
      }
    } catch (e: any) {
      console.warn("[M-Pesa STK Callback] Error updating MpesaCallback:", e.message);
    }

    // 3. Match strategy
    let loan: any = null;
    let borrower: any = null;

    // Strategy A: Match by CheckoutRequestID (Most reliable!)
    if (checkoutID) {
      const savedReq = await db(
        `SELECT "billRefNumber" as "loanId" FROM "MpesaCallback" WHERE "checkoutRequestId" = $1`,
        [checkoutID]
      );
      if (savedReq.length > 0 && savedReq[0].loanId) {
        const loanId = savedReq[0].loanId;
        const lById = await db(
          `SELECT l.*, b.id as "bId", b."fullName" FROM "Loan" l JOIN "Borrower" b ON l."borrowerId" = b.id WHERE l.id = $1`,
          [loanId]
        );
        if (lById.length > 0) {
          loan = lById[0];
          borrower = { ...lById[0], id: lById[0].bId };
          console.log("[M-Pesa STK Callback] Matched by CheckoutRequestID:", loan.id);
        }
      }
    }

    // Strategy B: Match by Phone (Fallback)
    if (!loan) {
      const phone0 = phone.startsWith("254") ? "0" + phone.slice(3) : phone;
      const phone254 = phone.startsWith("0") ? "254" + phone.slice(1) : phone;
      const bByPhone = await db(
        `SELECT * FROM "Borrower" WHERE phone IN ($1,$2,$3,$4)`,
        [phone, phone0, phone254, "+" + phone254]
      );
      if (bByPhone.length > 0) {
        borrower = bByPhone[0];
        const activeLoans = await db(
          `SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`,
          [borrower.id]
        );
        if (activeLoans.length > 0) {
          loan = activeLoans[0];
          console.log("[M-Pesa STK Callback] Matched by phone fallback:", loan.id);
        }
      }
    }

    // 4. Process Payment
    if (loan && borrower) {
      const installments = await db(
        `SELECT * FROM "Installment" WHERE "loanId" = $1 AND status IN ('Unpaid', 'Partial', 'Overdue') ORDER BY "dueDate" ASC`,
        [loan.id]
      );

      let remaining = amount;
      for (const inst of installments) {
        if (remaining <= 0) break;
        const due = Number(inst.expectedAmount) - Number(inst.paidAmount);
        const paying = Math.min(remaining, due);
        const newPaid = Number(inst.paidAmount) + paying;
        const newStatus = newPaid >= Number(inst.expectedAmount) ? "Paid" : "Partial";

        await db(
          `UPDATE "Installment" SET "paidAmount" = $1, status = $2 WHERE id = $3`,
          [newPaid, newStatus, inst.id]
        );
        remaining -= paying;
      }

      // Recalculate loan balance
      const allInst = await db(`SELECT COALESCE(SUM("paidAmount"), 0) as paid FROM "Installment" WHERE "loanId" = $1`, [loan.id]);
      const totalPaid = Number(allInst[0]?.paid || 0);
      const newBalance = Math.max(0, Number(loan.totalPayable) - totalPaid);
      const newStatus = newBalance <= 0 ? "Completed" : "Active";

      try {
        const repId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await db(
          `INSERT INTO "Repayment" (
            id, "organizationId", "loanId", "borrowerId", "loanOfficerId", "transId",
            amount, "paymentDate", "collectedById", method, phone, "balanceAfterPayment"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            repId, loan.organizationId, loan.id, loan.borrowerId, loan.loanOfficerId,
            mpesaReceipt, amount, new Date(), "mpesa_system", "Mobile Money", phone, newBalance,
          ]
        );

        await db(`UPDATE "Loan" SET balance = $1, status = $2, "lastPaymentDate" = $3 WHERE id = $4`, [newBalance, newStatus, new Date(), loan.id]);
        await db(`UPDATE "MpesaCallback" SET status = 'Processed' WHERE "transId" = $1`, [mpesaReceipt]);

        console.log("[M-Pesa STK Callback] ✅ Processed successfully. Receipt:", mpesaReceipt);

        // Revalidate paths for real-time updates
        revalidatePath('/repayments');
        revalidatePath('/dashboard');
        revalidatePath(`/loans/${loan.id}`);
        revalidatePath('/borrowers/' + borrower.id);
      } catch (procErr: any) {
        console.error("[M-Pesa STK Callback] Failed to record repayment:", procErr.message);
        await db(
          `UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = $2 WHERE "transId" = $1`,
          [mpesaReceipt, "Database error: " + procErr.message]
        ).catch(() => {});
      }

    } else {
      const reason = !borrower ? "No borrower matched" : "No active loan found";
      await db(`UPDATE "MpesaCallback" SET status = 'Unmatched', "errorMessage" = $2 WHERE "transId" = $1`, [mpesaReceipt, reason]);
      console.warn("[M-Pesa STK Callback] ⚠️ Unmatched:", reason, "Receipt:", mpesaReceipt);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (err: any) {
    console.error("[M-Pesa STK Callback] Unexpected error:", err.message);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
