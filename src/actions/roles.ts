'use server';

import { db } from "@/lib/db";

export async function getRoles(organizationId?: string, isSuperAdmin: boolean = false) {
  try {
    let query = `SELECT * FROM "Role" WHERE 1=1`;
    const params: any[] = [];
    
    if (!isSuperAdmin && organizationId) {
      query += ` AND ("organizationId" = $1 OR "organizationId" = 'system' OR "organizationId" IS NULL)`;
      params.push(organizationId);
    }
    
    const roles = await db(query, params);
    return { success: true, roles };
  } catch (error: any) {
    console.error("Failed to fetch roles:", error);
    return { success: false, error: error.message };
  }
}
