'use server';

import { db } from "@/lib/db";

export async function getRoles(organizationId: string) {
  try {
    const roles = await db(`SELECT * FROM "Role" WHERE "organizationId" = $1 OR "organizationId" = 'system' OR "organizationId" IS NULL`, [organizationId]);
    return { success: true, roles };
  } catch (error: any) {
    console.error("Failed to fetch roles:", error);
    return { success: false, error: error.message };
  }
}
