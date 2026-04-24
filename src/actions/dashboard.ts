'use server';

import { db } from '@/lib/db';

export async function getAdminDashboardStats(organizationId?: string) {
  try {
    const whereOrg = organizationId ? ` WHERE "organizationId" = $1` : '';
    const params = organizationId ? [organizationId] : [];

    // Parallel SQL queries
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
      totalBorrowersCount,
      activeLoansCount
    ] = await Promise.all([
      db(`SELECT id, status, principal, "issueDate", "loanProductId", "loanOfficerId", "totalPayable", "borrowerId", "branchId" FROM "Loan" ${whereOrg}`, params),
      db(`SELECT id, "fullName", "photoUrl", "registrationFeePaidAt", "organizationId", "branchId" FROM "Borrower" ${whereOrg}`, params),
      db(`SELECT id, category FROM "LoanProduct" ${whereOrg}`, params),
      db(`SELECT id, "fullName", "avatarUrl", "roleId" FROM "User" ${whereOrg}`, params),
      db(`SELECT id, name FROM "Branch" ${whereOrg}`, params),
      db(`SELECT id, amount, "createdAt" FROM "RegistrationPayment" ${whereOrg}`, params),
      db(`SELECT id, amount, "paymentDate", "loanId" FROM "Repayment" ${whereOrg}`, params),
      db(`SELECT id, status, "expectedAmount", "paidAmount", "loanId", "dueDate" FROM "Installment" ${whereOrg}`, params),
      db(`SELECT id, name FROM "Role"`, []),
      
      // Aggregates
      db(`SELECT COALESCE(SUM("totalPayable"), 0) as "totalPayable", COALESCE(SUM(principal), 0) as principal FROM "Loan" ${whereOrg} ${whereOrg ? 'AND' : 'WHERE'} status = 'Active'`, params),
      db(`SELECT COALESCE(SUM(amount), 0) as amount FROM "Repayment" ${whereOrg}`, params),
      db(`SELECT COUNT(*) as count FROM "Borrower" ${whereOrg}`, params),
      db(`SELECT COUNT(*) as count FROM "Loan" ${whereOrg} ${whereOrg ? 'AND' : 'WHERE'} status = 'Active'`, params)
    ]);

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
            totalDisbursed: Number(loanPortfolio[0]?.principal || 0),
            totalPayable: Number(loanPortfolio[0]?.totalPayable || 0),
            totalCollected: Number(repaymentTotals[0]?.amount || 0),
            totalBorrowers: Number(totalBorrowersCount[0]?.count || 0),
            activeLoans: Number(activeLoansCount[0]?.count || 0)
        }
      }
    };
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return { success: false, error: error.message };
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
      db(`SELECT * FROM "Loan" WHERE "branchId" = ANY($1)`, [branchIds]),
      db(`SELECT * FROM "Borrower" WHERE "organizationId" = $1`, [organizationId]),
      db(`SELECT * FROM "Installment" WHERE "organizationId" = $1`, [organizationId]),
      db(`SELECT * FROM "Repayment" WHERE "organizationId" = $1`, [organizationId]),
      db(`SELECT * FROM "Target" WHERE "branchId" = ANY($1) AND "userId" IS NULL`, [branchIds])
    ]);

    return {
      success: true,
      data: { loans, borrowers, installments, repayments, targets }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
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
      db(`SELECT * FROM "Loan" WHERE "loanOfficerId" = $1`, [loanOfficerId]),
      db(`SELECT * FROM "Borrower" WHERE "organizationId" = $1`, [organizationId]),
      db(`SELECT * FROM "Installment" WHERE "organizationId" = $1`, [organizationId]),
      db(`SELECT * FROM "Repayment" WHERE "organizationId" = $1`, [organizationId]),
      db(`SELECT * FROM "Target" WHERE "userId" = $1`, [loanOfficerId])
    ]);

    return {
      success: true,
      data: { loans, borrowers, installments, repayments, targets }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
