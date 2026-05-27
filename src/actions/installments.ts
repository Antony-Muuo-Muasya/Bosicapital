'use server'

import { db } from '@/lib/db'

export async function getInstallments(organizationId?: string, loanId?: string, dueDate?: string) {
  try {
    let query = `SELECT * FROM "Installment" WHERE 1=1`;
    const params: any[] = [];

    if (organizationId) {
      query += ` AND "organizationId" = $${params.length + 1}`;
      params.push(organizationId);
    }
    if (loanId) {
      query += ` AND "loanId" = $${params.length + 1}`;
      params.push(loanId);
    }
    if (dueDate) {
      query += ` AND "dueDate" = $${params.length + 1}`;
      params.push(dueDate);
    }

    query += ` ORDER BY "installmentNumber" ASC`;

    const installments = await db(query, params);
    return { success: true, installments };
  } catch (error: any) {
    console.error("Error fetching installments:", error);
    return { success: false, error: error.message };
  }
}

export async function getInstallmentsByOfficer(loanOfficerId: string) {
  try {
    if (!loanOfficerId) return [];
    return await db(`SELECT * FROM "Installment" WHERE "loanOfficerId" = $1 ORDER BY "dueDate" ASC`, [loanOfficerId]);
  } catch (error: any) {
    console.error("Error fetching officer installments:", error);
    return [];
  }
}

export async function getAllInstallments() {
  try {
    return await db(`SELECT * FROM "Installment" ORDER BY "dueDate" ASC`);
  } catch (error: any) {
    console.error("Error fetching all installments:", error);
    return [];
  }
}
