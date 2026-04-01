'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getLoans(organizationId: string, borrowerId?: string, branchIds?: string[], loanOfficerId?: string) {
  try {
    let query = `
      SELECT l.*, 
             lp.name as "productName", lp.category as "productCategory",
             json_agg(i.*) as installments
      FROM "Loan" l
      LEFT JOIN "LoanProduct" lp ON l."loanProductId" = lp.id
      LEFT JOIN "Installment" i ON l.id = i."loanId"
      WHERE l."organizationId" = $1
    `;
    const params: any[] = [organizationId];

    if (borrowerId) {
      query += ` AND l."borrowerId" = $${params.length + 1}`;
      params.push(borrowerId);
    }
    if (branchIds && branchIds.length > 0) {
      query += ` AND l."branchId" = ANY($${params.length + 1})`;
      params.push(branchIds);
    }
    if (loanOfficerId) {
      query += ` AND l."loanOfficerId" = $${params.length + 1}`;
      params.push(loanOfficerId);
    }
    
    query += ` GROUP BY l.id, lp.id ORDER BY l."issueDate" DESC`;

    const loansRaw = await db(query, params);
    
    const loans = loansRaw.map((l: any) => ({
      ...l,
      loanProduct: { id: l.loanProductId, name: l.productName, category: l.productCategory },
      // json_agg returns null for empty array, or array with nulls if no children matches
      installments: (l.installments || []).filter((i: any) => i !== null)
    }));

    return { success: true, loans };
  } catch (error: any) {
    console.error("Failed to fetch loans:", error);
    return { success: false, error: error.message };
  }
}

export async function getLoan(id: string) {
  try {
    const loanRes = await db(`SELECT * FROM "Loan" WHERE id = $1`, [id]);
    const loan = loanRes[0];
    if (!loan) return { success: false, error: 'Loan not found' };

    const [borrower, loanProduct, installments, repayments] = await Promise.all([
      db(`SELECT * FROM "Borrower" WHERE id = $1`, [loan.borrowerId]),
      db(`SELECT * FROM "LoanProduct" WHERE id = $1`, [loan.loanProductId]),
      db(`SELECT * FROM "Installment" WHERE "loanId" = $1 ORDER BY "installmentNumber" ASC`, [id]),
      db(`SELECT * FROM "Repayment" WHERE "loanId" = $1 ORDER BY "paymentDate" DESC`, [id])
    ]);

    return { 
      success: true, 
      loan: { 
        ...loan, 
        borrower: borrower[0], 
        loanProduct: loanProduct[0], 
        installments, 
        repayments 
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createLoan(data: any) {
  try {
    const id = `loan_${Math.random().toString(36).substr(2, 9)}`;
    const keys = Object.keys(data);
    const columns = keys.map(k => `"${k}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
    const values = keys.map(k => data[k]);

    const result = await db(`
      INSERT INTO "Loan" (id, ${columns})
      VALUES ($1, ${placeholders})
      RETURNING *
    `, [id, ...values]);
    
    revalidatePath('/loans');
    return { success: true, loan: result[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLoan(id: string, data: any, completeInstallments: boolean = false) {
  try {
    const keys = Object.keys(data);
    const sets = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
    const values = keys.map(k => data[k]);

    const result = await db(`
      UPDATE "Loan" SET ${sets} WHERE id = $1 RETURNING *
    `, [id, ...values]);

    if (completeInstallments) {
        await db(`UPDATE "Installment" SET "paidAmount" = "expectedAmount", status = 'Paid' WHERE "loanId" = $1`, [id]);
    }
    
    revalidatePath('/loans');
    return { success: true, loan: result[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function disburseLoan(id: string, data: any) {
  try {
    // 1. Update Loan status
    const loanResult = await db(`UPDATE "Loan" SET status = 'Active', "issueDate" = $2 WHERE id = $1 RETURNING *`, [id, data.issueDate]);
    const loan = loanResult[0];

    // 2. Build installments
    let currentDueDate = new Date(data.issueDate);
    for (let i = 1; i <= data.duration; i++) {
        if (data.repaymentCycle === 'Monthly') {
            currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        } else {
            currentDueDate.setDate(currentDueDate.getDate() + 7);
        }

        const instId = `inst_${Math.random().toString(36).substr(2, 9)}`;
        await db(`
            INSERT INTO "Installment" (id, "loanId", "borrowerId", "organizationId", "branchId", "loanOfficerId", "installmentNumber", "dueDate", "expectedAmount", "paidAmount", status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 'Unpaid')
        `, [
            instId, id, data.borrowerId, data.organizationId, data.branchId, data.loanOfficerId, 
            i, currentDueDate.toISOString().split('T')[0], data.installmentAmount
        ]);
    }

    revalidatePath('/loans');
    return { success: true, loan };
  } catch (error: any) {
    console.error("Disbursement error:", error);
    return { success: false, error: error.message };
  }
}
