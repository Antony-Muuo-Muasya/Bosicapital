import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.log("[M-Pesa STK Callback] Received:", rawBody);
    
    let parsed;
    try { parsed = JSON.parse(rawBody); } catch {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const stk = parsed?.Body?.stkCallback;
    if (!stk) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (stk.ResultCode !== 0) {
      console.log(`[M-Pesa STK] Payment failed or cancelled. Desc: ${stk.ResultDesc}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const metaItems = stk.CallbackMetadata?.Item || [];
    let amount = 0, mpesaReceipt = "", phone = "", transTime = "";

    for (const item of metaItems) {
      if (item.Name === "Amount") amount = item.Value;
      if (item.Name === "MpesaReceiptNumber") mpesaReceipt = item.Value;
      if (item.Name === "PhoneNumber") phone = String(item.Value);
      if (item.Name === "TransactionDate") transTime = String(item.Value);
    }

    if (!mpesaReceipt) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    // Step 1: Duplicate check
    const existing = await db(`SELECT id FROM "Repayment" WHERE "transId" = $1`, [mpesaReceipt]);
    if (existing.length > 0) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    // Step 2: Log Callback
    const mpesaId = `mpc_${Date.now()}_stk`;
    try {
      await db(
        `INSERT INTO "MpesaCallback" (
          id, "transId", msisdn, "transAmount", "transTime", status, "transactionType"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [mpesaId, mpesaReceipt, phone, String(amount), transTime, "Pending", "STK Push"]
      );
    } catch {}

    // Step 3: Match Borrower & Loan by Phone
    const phone0 = phone.startsWith("254") ? "0" + phone.slice(3) : phone;
    const phonePlus = phone.startsWith("+") ? phone : "+" + phone;

    let loan = null, borrower = null;
    const bByPhone = await db(
      `SELECT * FROM "Borrower" WHERE phone IN ($1, $2, $3, $4)`,
      [phone, phone0, phonePlus, phone.replace("+", "")]
    );

    if (bByPhone.length > 0) {
      borrower = bByPhone[0];
      const lByBorrower = await db(
        `SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`,
        [borrower.id]
      );
      if (lByBorrower.length > 0) loan = lByBorrower[0];
    }

    // Step 4: Record Repayment
    if (loan && borrower) {
      const repId = `rep_${Date.now()}`;
      const newBalance = Number(loan.balance) - amount;

      await db(
        `INSERT INTO "Repayment" (
          id, "organizationId", "loanId", "borrowerId", "loanOfficerId", "transId",
          amount, "paymentDate", "collectedById", method, phone, "balanceAfterPayment"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          repId, loan.organizationId, loan.id, loan.borrowerId, loan.loanOfficerId,
          mpesaReceipt, amount, new Date(), "mpesa_system", "Mobile Money", phone, newBalance
        ]
      );

      await db(`UPDATE "Loan" SET balance = $1 WHERE id = $2`, [newBalance, loan.id]);
      await db(`UPDATE "MpesaCallback" SET status = 'Processed' WHERE "transId" = $1`, [mpesaReceipt]);
      
      if (newBalance <= 0) {
        await db(`UPDATE "Loan" SET status = 'Completed' WHERE id = $1`, [loan.id]);
      }
    } else {
      await db(`UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = 'Could not match loan/borrower' WHERE "transId" = $1`, [mpesaReceipt]);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err: any) {
    console.error("[STK] Error:", err.message);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Error" });
  }
}
