'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getTargets(organizationId: string) {
  try {
    const targets = await db(`SELECT * FROM "Target" WHERE "organizationId" = $1 ORDER BY "startDate" DESC`, [organizationId]);
    return { success: true, targets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function bulkUpdateTargets(targets: any[]) {
    try {
        for (const target of targets) {
           const id = target.id || `target_${Math.random().toString(36).substr(2, 9)}`;
           if (target.id) {
               const keys = Object.keys(target).filter(k => k !== 'id');
               const sets = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
               const values = keys.map(k => target[k]);
               await db(`UPDATE "Target" SET ${sets} WHERE id = $1`, [target.id, ...values]);
           } else {
               const keys = Object.keys(target);
               const columns = keys.map(k => `"${k}"`).join(", ");
               const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
               const values = keys.map(k => target[k]);
               await db(`INSERT INTO "Target" (id, ${columns}) VALUES ($1, ${placeholders})`, [id, ...values]);
           }
        }
        revalidatePath('/reports')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createTarget(data: any) {
  try {
    const id = `target_${Math.random().toString(36).substr(2, 9)}`;
    const keys = Object.keys(data);
    const columns = keys.map(k => `"${k}"`).join(", ");
    const values = keys.map(k => data[k]);
    const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");

    const results = await db(`INSERT INTO "Target" (id, ${columns}) VALUES ($1, ${placeholders}) RETURNING *`, [id, ...values]);

    revalidatePath('/reports')
    return { success: true, target: results[0] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTarget(id: string, data: any) {
  try {
    const keys = Object.keys(data);
    const sets = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
    const values = keys.map(k => data[k]);

    await db(`UPDATE "Target" SET ${sets} WHERE id = $1`, [id, ...values]);

    revalidatePath('/reports')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteTarget(id: string) {
  try {
    await db(`DELETE FROM "Target" WHERE id = $1`, [id]);
    revalidatePath('/reports')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
