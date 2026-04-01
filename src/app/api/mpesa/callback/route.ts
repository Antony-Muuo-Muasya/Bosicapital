export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface MpesaCallbackData {
  TransactionType?: string;
  TransID?: string;
  TransTime?: string;
  TransAmount?: string;
  BusinessShortCode?: string;
  BillRefNumber?: string;
  MSISDN?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

function normalizePhoneNumber(msisdn: string): string | null {
  if (msisdn.startsWith("254") && msisdn.length === 12) {
    return "0" + msisdn.substring(3);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const callbackData: MpesaCallbackData = await req.json();
    const { TransID, BillRefNumber, MSISDN, TransAmount } = callbackData;
    const paymentAmount = parseFloat(TransAmount || "0");
    const mpesaId = `mpc_${Math.random().toString(36).substr(2, 9)}`;

    if (!TransID || isNaN(paymentAmount)) {
      await db(`
        INSERT INTO "MpesaCallback" (id, "TransID", "BillRefNumber", "MSISDN", "TransAmount", status, "errorMessage")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [mpesaId, TransID, BillRefNumber, MSISDN, TransAmount, "Failed", "Invalid TransID or TransAmount"]);
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid data" }, { status: 400 });
    }

    try {
      const existing = await db(`SELECT id FROM "Repayment" WHERE "transId" = $1`, [TransID]);
      if (existing.length > 0) {
        await db(`INSERT INTO "MpesaCallback" (id, "TransID", status, "errorMessage") VALUES ($1, $2, $3, $4)`, [mpesaId, TransID, "Processed", "Duplicate transaction"]);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      let loan: any = null;
      let borrower: any = null;

      // 1. Match by BillRefNumber as Loan ID
      if (BillRefNumber) {
        const matches = await db(`SELECT l.*, b.* FROM "Loan" l JOIN "Borrower" b ON l."borrowerId" = b.id WHERE l.id = $1`, [BillRefNumber]);
        if (matches.length > 0) {
          loan = matches[0];
          borrower = matches[0]; // Properties are merged in the join result
        }
      }

      // 2. Fallback to National ID
      if (!loan && BillRefNumber) {
        const bMatches = await db(`SELECT * FROM "Borrower" WHERE "nationalId" = $1`, [BillRefNumber]);
        if (bMatches.length > 0) {
          borrower = bMatches[0];
          const lMatches = await db(`SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`, [borrower.id]);
          if (lMatches.length > 0) loan = lMatches[0];
        }
      }

      // 3. Fallback to Phone
      if (!loan && MSISDN) {
        const phone = normalizePhoneNumber(MSISDN);
        if (phone) {
          const bMatches = await db(`SELECT * FROM "Borrower" WHERE phone = $1`, [phone]);
          if (bMatches.length > 0) {
            borrower = bMatches[0];
            const lMatches = await db(`SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`, [borrower.id]);
            if (lMatches.length > 0) loan = lMatches[0];
          }
        }
      }

      if (loan && borrower) {
        // Handle installments logic
        const unpaid = await db(`
          SELECT * FROM "Installment" 
          WHERE "loanId" = $1 AND status IN ('Unpaid', 'Partial', 'Overdue') 
          ORDER BY "dueDate" ASC
        `, [loan.id]);

        let remaining = paymentAmount;
        for (const inst of unpaid) {
          if (remaining <= 0) break;
          const due = Number(inst.expectedAmount) - Number(inst.paidAmount);
          if (remaining >= due) {
            await db(`UPDATE "Installment" SET "paidAmount" = $2, status = 'Paid' WHERE id = $1`, [inst.id, inst.expectedAmount]);
            remaining -= due;
          } else {
            await db(`UPDATE "Installment" SET "paidAmount" = "paidAmount" + $2, status = 'Partial' WHERE id = $1`, [inst.id, remaining]);
            remaining = 0;
          }
        }

        const totals = await db(`SELECT SUM("paidAmount") as paid FROM "Installment" WHERE "loanId" = $1`, [loan.id]);
        const totalPaid = Number(totals[0].paid || 0);
        const balance = Number(loan.totalPayable) - totalPaid;
        const newStatus = balance <= 0 ? "Completed" : "Active";

        await db(`UPDATE "Loan" SET status = $2, "lastPaymentDate" = $3 WHERE id = $1`, [loan.id, newStatus, new Date().toISOString()]);

        const repId = `rep_${Math.random().toString(36).substr(2, 9)}`;
        await db(`
          INSERT INTO "Repayment" (id, "organizationId", "loanId", "loanOfficerId", "borrowerId", "transId", amount, "paymentDate", "collectedById", method, phone, "balanceAfterPayment")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [repId, loan.organizationId, loan.id, loan.loanOfficerId, borrower.id, TransID, paymentAmount, new Date().toISOString(), 'mpesa_system', 'Mobile Money', MSISDN, balance]);

        await db(`INSERT INTO "MpesaCallback" (id, "TransID", status) VALUES ($1, $2, $3)`, [mpesaId, TransID, "Processed"]);
        
        // Revalidate NextJs cache to update the UI
        try {
          const { revalidatePath } = require('next/cache');
          revalidatePath('/repayments');
          revalidatePath('/dashboard');
          revalidatePath(`/loans/${loan.id}`);
          revalidatePath('/loans');
        } catch (e) {
          console.error("Failed to revalidate paths:", e);
        }
      } else {
        await db(`INSERT INTO "MpesaCallback" (id, "TransID", "BillRefNumber", "MSISDN", status, "errorMessage") VALUES ($1, $2, $3, $4, $5, $6)`, [mpesaId, TransID, BillRefNumber, MSISDN, "Failed", "Could not match loan/borrower"]);
      }

      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (innerError: any) {
      console.error("Callback processing error:", innerError);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  } catch (e: any) {
    console.error("M-Pesa Webhook Error:", e);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Error" }, { status: 500 });
  }
}
