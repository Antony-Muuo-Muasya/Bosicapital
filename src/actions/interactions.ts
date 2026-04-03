'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getInteractions(borrowerId: string) {
  try {
    const interactions = await db(`
      SELECT * FROM "Interaction"
      WHERE "borrowerId" = $1
      ORDER BY timestamp DESC
    `, [borrowerId]);
    return { success: true, interactions }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createInteraction(data: {
  borrowerId: string;
  organizationId: string;
  branchId: string;
  recordedById: string;
  recordedByName: string;
  notes: string;
}) {
  try {
    const id = `int_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const results = await db(`
      INSERT INTO "Interaction" (id, "borrowerId", "organizationId", "branchId", "recordedById", "recordedByName", timestamp, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, data.borrowerId, data.organizationId, data.branchId, data.recordedById, data.recordedByName, timestamp, data.notes]);

    revalidatePath(`/borrowers/${data.borrowerId}`)
    return { success: true, interaction: results[0] }
  } catch (error: any) {
    console.error("Critical error in createInteraction:", error);
    return { success: false, error: error.message }
  }
}
