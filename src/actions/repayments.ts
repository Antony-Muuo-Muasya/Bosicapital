'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getRepayments(organizationId: string, loanId?: string, borrowerId?: string) {
  try {
    let query = `
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
    const params: any[] = [organizationId];

    if (loanId) {
      query += ` AND r."loanId" = $${params.length + 1}`;
      params.push(loanId);
    }
    if (borrowerId) {
      query += ` AND r."borrowerId" = $${params.length + 1}`;
      params.push(borrowerId);
    }

    query += ` ORDER BY r."paymentDate" DESC`;

    const repaymentsRaw = await db(query, params);
    
    const repayments = repaymentsRaw.map((r: any) => ({
      ...r,
      loan: { id: r.loanId, status: r.loanStatus, loanProduct: { name: r.productName } },
      borrower: { id: r.borrowerId, fullName: r.borrowerName }
    }));

    return { success: true, repayments };
  } catch (error: any) {
    console.error("Failed to fetch repayments:", error);
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
