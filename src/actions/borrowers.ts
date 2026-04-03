'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getBorrowers(organizationId?: string, userId?: string, createdBy?: string, branchIds?: string[]) {
  try {
    let query = `
      SELECT b.*, u."fullName" as "createdByStaffName"
      FROM "Borrower" b
      LEFT JOIN "User" u ON b."createdBy" = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (organizationId) {
      query += ` AND b."organizationId" = $${params.length + 1}`;
      params.push(organizationId);
    }

    if (userId) {
      query += ` AND b."userId" = $${params.length + 1}`;
      params.push(userId);
    }

    if (createdBy) {
      query += ` AND b."createdBy" = $${params.length + 1}`;
      params.push(createdBy);
    }

    if (branchIds && branchIds.length > 0) {
      query += ` AND b."branchId" = ANY($${params.length + 1})`;
      params.push(branchIds);
    }

    query += ` ORDER BY b."fullName" ASC`;

    const borrowers = await db(query, params);
    return { success: true, borrowers }
  } catch (error: any) {
    console.error("Error fetching borrowers:", error);
    return { success: false, error: error.message }
  }
}

export async function getBorrower(id: string) {
    try {
      const borrowers = await db(`SELECT * FROM "Borrower" WHERE id = $1`, [id]);
      const borrower = borrowers[0];
      if (!borrower) return { success: false, error: 'Borrower not found' }
      return { success: true, borrower }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
}

export async function createBorrower(data: any) {
  // This seems to be a generic create, but we usually use registerBorrower.
  // Converting just in case it's used elsewhere.
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');

    const results = await db(`
      INSERT INTO "Borrower" (${columns})
      VALUES (${placeholders})
      RETURNING *
    `, values);
    
    revalidatePath('/borrowers')
    return { success: true, borrower: results[0] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateBorrower(id: string, data: any) {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');

    await db(`
      UPDATE "Borrower"
      SET ${setClause}
      WHERE id = $1
    `, [id, ...values]);

    revalidatePath('/borrowers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBorrower(id: string) {
  try {
    await db(`DELETE FROM "Borrower" WHERE id = $1`, [id]);
    revalidatePath('/borrowers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function payRegistrationFee(data: {
  organizationId: string;
  borrowerId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  collectedBy: string;
}) {
  try {
    const id = `reg_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db(`
      INSERT INTO "RegistrationPayment" (id, "organizationId", "borrowerId", amount, "paymentMethod", reference, "collectedBy", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, data.organizationId, data.borrowerId, data.amount, data.paymentMethod, data.reference, data.collectedBy, now]);

    await db(`
      UPDATE "Borrower"
      SET "registrationFeePaid" = true,
          "registrationFeePaidAt" = $2,
          "registrationPaymentId" = $3
      WHERE id = $1
    `, [data.borrowerId, now, id]);

    revalidatePath('/borrowers');
    return { success: true };
  } catch (error: any) {
    console.error("Error paying registration fee:", error);
    return { success: false, error: error.message };
  }
}
