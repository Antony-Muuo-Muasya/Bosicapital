'use server'

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

import { unstable_cache } from "next/cache";

export const getBranches = unstable_cache(
  async (organizationId: string) => {
    try {
      const branches = await prisma.branch.findMany({
        where: { organizationId }
      });
      return { success: true, branches };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
  ['branches-lookup'],
  { revalidate: 3600, tags: ['branches'] }
);

export async function createBranch(data: { name: string, location: string, organizationId: string }) {
  try {
    const branch = await prisma.branch.create({
      data: {
        name: data.name,
        location: data.location,
        organizationId: data.organizationId,
        isMain: false
      }
    });
    
    revalidatePath('/dashboard');
    revalidatePath('/branches');
    revalidatePath('/settings');
    return { success: true, branch };
  } catch (error: any) {
    console.error("Failed to create branch:", error);
    return { success: false, error: error.message };
  }
}

export async function updateBranch(id: string, data: { name?: string, location?: string, isMain?: boolean }) {
  try {
    const branch = await prisma.branch.update({
      where: { id },
      data
    });
    revalidatePath('/settings');
    return { success: true, branch };
  } catch (error: any) {
    console.error("Failed to update branch:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBranch(id: string) {
  try {
    await prisma.branch.delete({
      where: { id }
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete branch:", error);
    return { success: false, error: error.message };
  }
}

export async function getBranchPerformance(organizationId: string) {
  try {
    const branches = await prisma.branch.findMany({
      where: { organizationId },
      include: {
          borrowers: { select: { id: true } },
          loans: {
              select: {
                  id: true,
                  principal: true,
                  totalPayable: true,
                  status: true,
                  repayments: { select: { amount: true } }
              }
          },
          installments: {
              where: { status: 'Overdue' },
              select: { id: true }
          }
      }
    });

    const performanceData = branches.map(branch => {
      const totalBorrowers = branch.borrowers.length;
      const totalLoans = branch.loans.length;
      const activeLoans = branch.loans.filter(l => l.status === 'Active' || l.status === 'Approved').length;
      const totalPrincipal = branch.loans.reduce((acc, l) => acc + l.principal, 0);
      const totalCollected = branch.loans.reduce((acc, l) => {
          const loanRepaid = l.repayments.reduce((rAcc, r) => rAcc + (r.amount || 0), 0);
          return acc + loanRepaid;
      }, 0);
      const overdueInstallments = branch.installments.length;

      return {
          id: branch.id,
          name: branch.name,
          totalBorrowers,
          totalLoans,
          activeLoans,
          totalPrincipal,
          totalCollected,
          overdueInstallments,
          collectionRate: totalPrincipal > 0 ? (totalCollected / totalPrincipal) * 100 : 0
      };
    });

    return { success: true, data: performanceData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
