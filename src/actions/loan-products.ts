'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getLoanProducts(organizationId: string) {
  try {
    const products = await db(`SELECT * FROM "LoanProduct" WHERE "organizationId" = $1`, [organizationId]);
    return { success: true, products };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createLoanProduct(data: any) {
  try {
    const id = `lp_${Math.random().toString(36).substr(2, 9)}`;
    const keys = Object.keys(data);
    const columns = keys.map(k => `"${k}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
    const values = keys.map(k => data[k]);

    const result = await db(`
      INSERT INTO "LoanProduct" (id, ${columns})
      VALUES ($1, ${placeholders})
      RETURNING *
    `, [id, ...values]);
    
    revalidatePath('/settings');
    return { success: true, product: result[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLoanProduct(id: string, data: any) {
  try {
    const keys = Object.keys(data);
    const sets = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
    const values = keys.map(k => data[k]);

    const result = await db(`UPDATE "LoanProduct" SET ${sets} WHERE id = $1 RETURNING *`, [id, ...values]);
    revalidatePath('/settings');
    return { success: true, product: result[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteLoanProduct(id: string) {
  try {
    await db(`DELETE FROM "LoanProduct" WHERE id = $1`, [id]);
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
