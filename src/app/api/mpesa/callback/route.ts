export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revalidatePath } from 'next/cache';

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
  return msisdn; // Fallback to raw if not matching logic
}

export async function POST(req: Request) {
  try {
    const callbackData: MpesaCallbackData = await req.json();
    console.log("[M-Pesa Webhook] Payload received:", JSON.stringify(callbackData));

    const { TransID, BillRefNumber, MSISDN, TransAmount, TransTime, BusinessShortCode, FirstName, MiddleName, LastName, TransactionType } = callbackData;
    const paymentAmount = parseFloat(TransAmount || "0");
    const mpesaId = `mpc_${Math.random().toString(36).substr(2, 9)}`;

    if (!TransID || isNaN(paymentAmount)) {
      await db(`
        INSERT INTO "MpesaCallback" (id, "transId", "billRefNumber", msisdn, "transAmount", status, "errorMessage")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [mpesaId, TransID || 'unknown', BillRefNumber, MSISDN, TransAmount, "Failed", "Invalid TransID or TransAmount"]);
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid data" }, { status: 400 });
    }

    try {
      // 1. Log the hit to MpesaCallback
      await db(`
        INSERT INTO "MpesaCallback" (
          id, "transId", "billRefNumber", msisdn, "transAmount", "transTime", 
          "businessShortCode", "firstName", "middleName", "lastName", status, "transactionType"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        mpesaId, TransID, BillRefNumber, MSISDN, TransAmount, TransTime, 
        BusinessShortCode, FirstName, MiddleName, LastName, "Pending", TransactionType
      ]);

      // Check for duplicate
      const existing = await db(`SELECT id FROM "Repayment" WHERE "transId" = $1`, [TransID]);
      if (existing.length > 0) {
        await db(`UPDATE "MpesaCallback" SET status = 'Duplicate' WHERE id = $1`, [mpesaId]);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      let loan: any = null;
      let borrower: any = null;

      // 2. Match by BillRefNumber as National ID (most common) or Loan ID
      if (BillRefNumber) {
        const cleanedRef = BillRefNumber.trim();
        
        // Search by National ID
        const bByNational = await db(`SELECT * FROM "Borrower" WHERE "nationalId" = $1`, [cleanedRef]);
        if (bByNational.length > 0) {
          borrower = bByNational[0];
          const lByBorrower = await db(`SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`, [borrower.id]);
          if (lByBorrower.length > 0) loan = lByBorrower[0];
        }

        // Fallback search by Loan ID directly
        if (!loan) {
            const lById = await db(`SELECT l.*, b.* FROM "Loan" l JOIN "Borrower" b ON l."borrowerId" = b.id WHERE l.id = $1`, [cleanedRef]);
            if (lById.length > 0) {
                loan = lById[0];
                borrower = lById[0];
            }
        }
      }

      // 3. Fallback to Phone Number
      if (!loan && MSISDN) {
        const phone = normalizePhoneNumber(MSISDN);
        const bByPhone = await db(`SELECT * FROM "Borrower" WHERE phone = $1`, [phone]);
        if (bByPhone.length > 0) {
          borrower = bByPhone[0];
          const lByBorrower = await db(`SELECT * FROM "Loan" WHERE "borrowerId" = $1 AND status = 'Active' ORDER BY "issueDate" DESC LIMIT 1`, [borrower.id]);
          if (lByBorrower.length > 0) loan = lByBorrower[0];
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
          INSERT INTO "Repayment" (
            id, "organizationId", "loanId", "loanOfficerId", "borrowerId", "transId", 
            amount, "paymentDate", "collectedById", method, phone, "balanceAfterPayment"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          repId, loan.organizationId, loan.id, loan.loanOfficerId, borrower.id, TransID, 
          paymentAmount, new Date().toISOString(), 'mpesa_system', 'Mobile Money', MSISDN, balance
        ]);

        await db(`UPDATE "MpesaCallback" SET status = 'Processed' WHERE id = $1`, [mpesaId]);
        
        // Final revalidation
        revalidatePath('/repayments');
        revalidatePath('/dashboard');
        revalidatePath(`/loans/${loan.id}`);
        revalidatePath('/borrowers');
        revalidatePath('/borrowers/' + borrower.id);

      } else {
        await db(`UPDATE "MpesaCallback" SET status = 'Failed', "errorMessage" = 'Could not match loan/borrower' WHERE id = $1`, [mpesaId]);
      }

      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (innerError: any) {
      console.error("[M-Pesa Webhook] Processing Error:", innerError);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }); // Still accept to stop retries
    }
  } catch (e: any) {
    console.error("[M-Pesa Webhook] Critical Error:", e);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Server Error" }, { status: 500 });
  }
}
