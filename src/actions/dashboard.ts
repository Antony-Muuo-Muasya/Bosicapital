'use server'

import prisma from '@/lib/db'

export async function getAdminDashboardStats(organizationId?: string) {
  try {
    const whereOrg: any = organizationId ? { organizationId } : {}
    
    // Perform parallel queries for efficiency
    const [
      loans,
      borrowers,
      loanProducts,
      users,
      branches,
      regPayments,
      repayments,
      installments,
      roles
    ] = await Promise.all([
      prisma.loan.findMany({ where: whereOrg }),
      prisma.borrower.findMany({ where: whereOrg }),
      prisma.loanProduct.findMany({ where: whereOrg }),
      prisma.user.findMany({ where: whereOrg }),
      prisma.branch.findMany({ where: whereOrg }),
      prisma.registrationPayment.findMany({ where: whereOrg }),
      prisma.repayment.findMany({ where: whereOrg }),
      prisma.installment.findMany({ where: whereOrg }),
      prisma.role.findMany()
    ])

    return {
      success: true,
      data: {
        loans,
        borrowers,
        loanProducts,
        users,
        branches,
        regPayments,
        repayments,
        installments,
        roles
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getManagerDashboardStats(organizationId: string, branchIds: string[]) {
  try {
    const [
      loans,
      borrowers,
      installments,
      repayments,
      targets
    ] = await Promise.all([
      prisma.loan.findMany({ where: { branchId: { in: branchIds } } }),
      prisma.borrower.findMany({ where: { organizationId } }),
      prisma.installment.findMany({ where: { organizationId } }),
      prisma.repayment.findMany({ where: { organizationId } }),
      prisma.target.findMany({ where: { branchId: { in: branchIds }, userId: null } })
    ])

    return {
      success: true,
      data: {
        loans,
        borrowers,
        installments,
        repayments,
        targets
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getLoanOfficerDashboardStats(organizationId: string, loanOfficerId: string) {
  try {
     const [
      loans,
      borrowers,
      installments,
      repayments,
      targets
    ] = await Promise.all([
      prisma.loan.findMany({ where: { loanOfficerId } }),
      prisma.borrower.findMany({ where: { organizationId } }),
      prisma.installment.findMany({ where: { organizationId } }),
      prisma.repayment.findMany({ where: { organizationId } }),
      prisma.target.findMany({ where: { userId: loanOfficerId } })
    ])

    return {
      success: true,
      data: {
        loans,
        borrowers,
        installments,
        repayments,
        targets
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
