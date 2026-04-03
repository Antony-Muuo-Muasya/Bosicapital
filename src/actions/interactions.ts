'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getInteractions(borrowerId: string) {
  try {
    const interactions = await db(`
      SELECT i.*, u."fullName" as "recordedByName"
      FROM "Interaction" i
      LEFT JOIN "User" u ON i."recordedBy" = u.id
      WHERE i."borrowerId" = $1
      ORDER BY i."createdAt" DESC
    `, [borrowerId]);
    return { success: true, interactions }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createInteraction(data: {
  borrowerId: string;
  organizationId: string;
  type: string;
  content: string;
  recordedBy: string;
}) {
  try {
    const id = `int_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const results = await db(`
      INSERT INTO "Interaction" (id, "borrowerId", "organizationId", type, content, "recordedBy", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, data.borrowerId, data.organizationId, data.type, data.content, data.recordedBy, now]);

    revalidatePath(`/borrowers/${data.borrowerId}`)
    return { success: true, interaction: results[0] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
