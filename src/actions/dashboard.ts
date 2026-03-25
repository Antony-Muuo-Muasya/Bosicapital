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
      roles,
      loanPortfolio,
      repaymentTotals,
      totalBorrowers,
      activeLoansCount
    ] = await Promise.all([
      prisma.loan.findMany({ 
        where: whereOrg,
        select: { id: true, status: true, principal: true, issueDate: true, loanProductId: true, loanOfficerId: true, totalPayable: true, borrowerId: true }
      }),
      prisma.borrower.findMany({ 
        where: whereOrg,
        select: { id: true, registrationFeePaidAt: true, organizationId: true, branchId: true }
      }),
      prisma.loanProduct.findMany({ 
        where: whereOrg,
        select: { id: true, category: true }
      }),
      prisma.user.findMany({ 
        where: whereOrg,
        select: { id: true, fullName: true, avatarUrl: true, roleId: true }
      }),
      prisma.branch.findMany({ 
        where: whereOrg,
        select: { id: true, name: true }
      }),
      prisma.registrationPayment.findMany({ 
        where: whereOrg,
        select: { id: true, amount: true, createdAt: true }
      }),
      prisma.repayment.findMany({ 
        where: whereOrg,
        select: { id: true, amount: true, paymentDate: true, loanId: true }
      }),
      prisma.installment.findMany({ 
        where: whereOrg,
        select: { id: true, status: true, expectedAmount: true, paidAmount: true, loanId: true, dueDate: true }
      }),
      prisma.role.findMany({
        select: { id: true, name: true }
      }),
      // Aggregates for efficiency
      prisma.loan.aggregate({
        where: { ...whereOrg, status: 'Active' },
        _sum: { totalPayable: true, principal: true }
      }),
      prisma.repayment.aggregate({
        where: whereOrg,
        _sum: { amount: true }
      }),
      prisma.borrower.count({ where: whereOrg }),
      prisma.loan.count({ where: { ...whereOrg, status: 'Active' } })
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
        roles,
        summary: {
            totalDisbursed: loanPortfolio._sum.principal || 0,
            totalPayable: loanPortfolio._sum.totalPayable || 0,
            totalCollected: repaymentTotals._sum.amount || 0,
            totalBorrowers,
            activeLoans: activeLoansCount
        }
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
