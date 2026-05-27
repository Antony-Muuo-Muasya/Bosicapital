'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getOrganization(id: string) {
  try {
    const results = await db(`SELECT * FROM "Organization" WHERE id = $1`, [id]);
    const org = results[0];
    return { success: true, organization: org }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateOrganization(id: string, data: any) {
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');

    const results = await db(`
      UPDATE "Organization"
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, [id, ...values]);

    revalidatePath('/settings')
    return { success: true, organization: results[0] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
