'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getBranches(organizationId: string) {
  try {
    const branches = await db(`SELECT * FROM "Branch" WHERE "organizationId" = $1`, [organizationId]);
    return { success: true, branches };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createBranch(data: { name: string, location: string, organizationId: string }) {
  try {
    const id = `branch_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    const result = await db(`
      INSERT INTO "Branch" (id, "organizationId", name, location, "isMain", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING *
    `, [id, data.organizationId, data.name, data.location, false, createdAt]);
    
    revalidatePath('/dashboard');
    revalidatePath('/branches');
    revalidatePath('/settings');
    return { success: true, branch: result[0] };
  } catch (error: any) {
    console.error("Failed to create branch:", error);
    return { success: false, error: error.message };
  }
}

export async function updateBranch(id: string, data: { name?: string, location?: string, isMain?: boolean }) {
  try {
    const updatedAt = new Date().toISOString();
    
    const result = await db(`
      UPDATE "Branch"
      SET name = COALESCE($2, name),
          location = COALESCE($3, location),
          "isMain" = COALESCE($4, "isMain"),
          "updatedAt" = $5
      WHERE id = $1
      RETURNING *
    `, [id, data.name, data.location, data.isMain, updatedAt]);
    
    revalidatePath('/settings');
    return { success: true, branch: result[0] };
  } catch (error: any) {
    console.error("Failed to update branch:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBranch(id: string) {
  try {
    await db(`DELETE FROM "Branch" WHERE id = $1`, [id]);
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete branch:", error);
    return { success: false, error: error.message };
  }
}

export async function getBranchPerformance(organizationId: string) {
  try {
    const performanceData = await db(`
      SELECT b.id, b.name,
             (SELECT COUNT(*) FROM "Borrower" WHERE "branchId" = b.id) as "totalBorrowers",
             (SELECT COUNT(*) FROM "Loan" WHERE "branchId" = b.id) as "totalLoans",
             (SELECT COUNT(*) FROM "Loan" WHERE "branchId" = b.id AND status IN ('Active', 'Approved')) as "activeLoans",
             (SELECT COALESCE(SUM(principal), 0) FROM "Loan" WHERE "branchId" = b.id) as "totalPrincipal",
             (SELECT COALESCE(SUM(amount), 0) FROM "Repayment" r JOIN "Loan" l ON r."loanId" = l.id WHERE l."branchId" = b.id) as "totalCollected",
             (SELECT COUNT(*) FROM "Installment" i JOIN "Loan" l ON i."loanId" = l.id WHERE l."branchId" = b.id AND i.status = 'Overdue') as "overdueInstallments"
      FROM "Branch" b
      WHERE b."organizationId" = $1
    `, [organizationId]);

    // Handle string to number conversion for aggregates
    const mappedData = performanceData.map((row: any) => ({
      ...row,
      totalBorrowers: Number(row.totalBorrowers),
      totalLoans: Number(row.totalLoans),
      activeLoans: Number(row.activeLoans),
      totalPrincipal: Number(row.totalPrincipal),
      totalCollected: Number(row.totalCollected),
      overdueInstallments: Number(row.overdueInstallments),
      collectionRate: Number(row.totalPrincipal) > 0 ? (Number(row.totalCollected) / Number(row.totalPrincipal)) * 100 : 0
    }));

    return { success: true, data: mappedData };
  } catch (error: any) {
    console.error("Error in getBranchPerformance:", error);
    return { success: false, error: error.message };
  }
}
