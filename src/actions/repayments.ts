'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getRepayments(organizationId: string, loanId?: string, borrowerId?: string) {
  try {
    // 1. Fetch Loan Repayments
    let repQuery = `
      SELECT r.*, 
             l.status as "loanStatus", 
             lp.name as "productName",
             b."fullName" as "borrowerName"
      FROM "Repayment" r
      JOIN "Loan" l ON r."loanId" = l.id
      JOIN "LoanProduct" lp ON l."loanProductId" = lp.id
      JOIN "Borrower" b ON r."borrowerId" = b.id
      WHERE r."organizationId" = $1
    `;
    const repParams: any[] = [organizationId];

    if (loanId) {
      repQuery += ` AND r."loanId" = $${repParams.length + 1}`;
      repParams.push(loanId);
    }
    if (borrowerId) {
      repQuery += ` AND r."borrowerId" = $${repParams.length + 1}`;
      repParams.push(borrowerId);
    }
    repQuery += ` ORDER BY r."paymentDate" DESC`;
    const repaymentsRaw = await db(repQuery, repParams);

    // 2. Fetch Registration Payments (if no specific loanId is requested)
    let regPayments: any[] = [];
    if (!loanId) {
      let regQuery = `SELECT * FROM "RegistrationPayment" WHERE "organizationId" = $1`;
      const regParams: any[] = [organizationId];
      if (borrowerId) {
        regQuery += ` AND "borrowerId" = $2`;
        regParams.push(borrowerId);
      }
      regPayments = await db(regQuery, regParams);
    }

    // 3. Merge and standardize
    const formattedReps = repaymentsRaw.map((r: any) => ({
      ...r,
      type: 'Loan Repayment',
      loan: { id: r.loanId, status: r.loanStatus, loanProduct: { name: r.productName } },
      borrower: { id: r.borrowerId, fullName: r.borrowerName }
    }));

    const formattedRegs = regPayments.map((rp: any) => ({
      id: rp.id,
      amount: rp.amount,
      paymentDate: rp.createdAt,
      transId: rp.reference,
      method: rp.paymentMethod,
      type: 'Registration Fee',
      borrowerId: rp.borrowerId,
      organizationId: rp.organizationId
    }));

    const allPayments = [...formattedReps, ...formattedRegs].sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );

    return { success: true, repayments: allPayments };
  } catch (error: any) {
    console.error("Failed to fetch payments:", error);
    return { success: false, error: error.message };
  }
}

export async function createRepayment(data: any) {
  try {
    const id = `rep_${Math.random().toString(36).substr(2, 9)}`;
    const keys = Object.keys(data);
    const columns = keys.map(k => `"${k}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
    const values = keys.map(k => data[k]);

    const result = await db(`
      INSERT INTO "Repayment" (id, ${columns})
      VALUES ($1, ${placeholders})
      RETURNING *
    `, [id, ...values]);

    // Update loan last payment date
    if (data.loanId) {
        await db(`UPDATE "Loan" SET "lastPaymentDate" = $2 WHERE id = $1`, [data.loanId, data.paymentDate]);
    }

    revalidatePath('/repayments');
    if (data.loanId) revalidatePath(`/loans/${data.loanId}`);
    if (data.borrowerId) revalidatePath(`/borrowers/${data.borrowerId}`);
    
    return { success: true, repayment: result[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
