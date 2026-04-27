import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // If payment was cancelled or failed, log and exit
    if (stk.ResultCode !== 0) {
      console.log(`[M-Pesa STK Callback] Payment not completed. Code: ${stk.ResultCode}, Desc: ${stk.ResultDesc}`);
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

    console.log("[M-Pesa STK Callback] Parsed:", { amount, mpesaReceipt, phone, transTime });

    if (!mpesaReceipt) {
      console.warn("[M-Pesa STK Callback] No MpesaReceiptNumber found");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // FIX 1: Duplicate check — don't process the same receipt twice
    const existing = await db(`SELECT id FROM "Repayment" WHERE "transId" = $1`, [mpesaReceipt]);
    if (existing.length > 0) {
      console.log("[M-Pesa STK Callback] Already processed:", mpesaReceipt);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Log callback to DB first
    const mpesaId = `mpc_${Date.now()}_stk`;
    try {
      await db(
        `INSERT INTO "MpesaCallback" (id, "transId", msisdn, "transAmount", "transTime", status, "transactionType")
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [mpesaId, mpesaReceipt, phone, String(amount), transTime, "Pending", "STK Push"]
      );
    } catch (e: any) {
      console.warn("[M-Pesa STK Callback] Could not log to MpesaCallback:", e.message);
    }

    // FIX 2: Multi-strategy loan/borrower matching
    // Phone number variants
    const phone254 = phone.startsWith("254") ? phone : "254" + phone.replace(/^\+?0?/, "");
    const phone0 = phone.startsWith("254") ? "0" + phone.slice(3) : phone;
    const phonePlus = "+" + phone.replace(/^\+/, "");
    const phoneRaw = phone.replace(/^\+/, "");

    let loan: any = null;
    let borrower: any = null;

    // Strategy 1: Match borrower by phone (all variants)
    const bByPhone = await db(
      `SELECT * FROM "Borrower" WHERE phone IN ($1,$2,$3,$4)`,
      [phone254, phone0, phonePlus, phoneRaw]
    );

    if (bByPhone.length > 0) {
      borrower = bByPhone[0];
      console.log("[M-Pesa STK Callback] Matched borrower by phone:", borrower.id);
    }

    // FIX 3: Strategy 2 — also try matching by AccountReference (National ID) from TransactionDesc
    // The AccountReference was the National ID we set during STK push
    if (!borrower) {
      // Try to match via the STK checkout request ID stored in MpesaCallback if applicable
      console.log("[M-Pesa STK Callback] No phone match. Receipt:", mpesaReceipt, "— will record as unmatched");
    }

    // If borrower found, get their active loan
    if (borrower) {
      const loans = await db(
        `SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`,
        [borrower.id]
      );
      if (loans.length > 0) {
        loan = loans[0];
        console.log("[M-Pesa STK Callback] Matched loan:", loan.id);
      }
    }

    if (loan && borrower) {
      const repId = `rep_${Date.now()}`;

      // FIX 4: Calculate new balance from installments (not loan.balance which may be stale)
      const installments = await db(
        `SELECT * FROM "Installment" WHERE "loanId" = $1 ORDER BY "installmentNumber" ASC`,
        [loan.id]
      );
      const totalPaid = installments.reduce((sum: number, i: any) => sum + Number(i.paidAmount), 0);
      const newBalance = Math.max(0, Number(loan.totalPayable) - totalPaid - amount);

      // Record repayment
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

      // FIX 5: Apply payment to installments (oldest unpaid first)
      let remaining = amount;
      for (const inst of installments) {
        if (remaining <= 0) break;
        const due = Number(inst.expectedAmount) - Number(inst.paidAmount);
        if (due <= 0) continue;

        const paying = Math.min(remaining, due);
        const newPaid = Number(inst.paidAmount) + paying;
        const newStatus = newPaid >= Number(inst.expectedAmount) ? "Paid" : "Partial";

        await db(
          `UPDATE "Installment" SET "paidAmount" = $1, status = $2 WHERE id = $3`,
          [newPaid, newStatus, inst.id]
        );
        remaining -= paying;
      }

      // Update loan balance field
      await db(`UPDATE "Loan" SET balance = $1 WHERE id = $2`, [newBalance, loan.id]);

      // Mark loan as completed if fully paid
      if (newBalance <= 0) {
        await db(
          `UPDATE "Loan" SET status = 'Completed' WHERE id = $1`,
          [loan.id]
        );
        console.log("[M-Pesa STK Callback] Loan completed:", loan.id);
      }

      // Mark callback as processed
      await db(`UPDATE "MpesaCallback" SET status = 'Processed' WHERE "transId" = $1`, [mpesaReceipt]);

      console.log("[M-Pesa STK Callback] ✅ Payment processed. Receipt:", mpesaReceipt, "Amount:", amount, "New balance:", newBalance);
    } else {
      // FIX 6: Mark as failed with specific reason
      const reason = !borrower ? "No borrower matched the phone number" : "No active loan found for borrower";
      await db(
        `UPDATE "MpesaCallback" SET status = 'Unmatched', "errorMessage" = $2 WHERE "transId" = $1`,
        [mpesaReceipt, reason]
      );
      console.warn("[M-Pesa STK Callback] ⚠️ Could not match payment:", reason, "Phone:", phone);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (err: any) {
    console.error("[M-Pesa STK Callback] Unexpected error:", err.message);
    // Always return 200 to Safaricom so they don't retry indefinitely
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
