'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getLoans(organizationId: string, borrowerId?: string, branchIds?: string[], loanOfficerId?: string) {
  try {
    const where: any = { organizationId }
    if (borrowerId) {
      where.borrowerId = borrowerId
    }
    if (branchIds && branchIds.length > 0) {
      where.branchId = { in: branchIds }
    }
    if (loanOfficerId) {
      where.loanOfficerId = loanOfficerId
    }
    
    const loans = await prisma.loan.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      include: {
        loanProduct: true
      }
    })
    return { success: true, loans }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getLoan(id: string) {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: true,
        loanProduct: true,
        installments: {
           orderBy: { installmentNumber: 'asc' }
        },
        repayments: {
           orderBy: { paymentDate: 'desc' }
        }
      }
    })
    if (!loan) return { success: false, error: 'Loan not found' }
    return { success: true, loan }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createLoan(data: any) {
  try {
    const loan = await prisma.loan.create({
      data
    })
    
    revalidatePath('/loans')
    if (data.borrowerId) {
       revalidatePath(`/borrowers/${data.borrowerId}`)
    }
    return { success: true, loan }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateLoan(id: string, data: any, completeInstallments: boolean = false) {
  try {
    const loan = await prisma.loan.update({
      where: { id },
      data
    })

    if (completeInstallments) {
        // Complete all installments
        const installments = await prisma.installment.findMany({ where: { loanId: id } });
        for (const inst of installments) {
            await prisma.installment.update({
                where: { id: inst.id },
                data: { paidAmount: inst.expectedAmount, status: 'Paid' }
            });
        }
    }
    
    revalidatePath('/loans')
    if (loan.borrowerId) {
       revalidatePath(`/borrowers/${loan.borrowerId}`)
    }
    return { success: true, loan }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function disburseLoan(id: string, data: { issueDate: string, duration: number, installmentAmount: number, borrowerId: string, organizationId: string, branchId: string, loanOfficerId: string, repaymentCycle: 'Weekly' | 'Monthly' }) {
  try {
     const result = await prisma.$transaction(async (tx) => {
        const loan = await tx.loan.update({
            where: { id },
            data: { status: 'Active', issueDate: data.issueDate }
        })

        const installments = []
        let currentDueDate = new Date(data.issueDate)
        
        for (let i = 1; i <= data.duration; i++) {
            if (data.repaymentCycle === 'Monthly') {
                currentDueDate.setMonth(currentDueDate.getMonth() + 1)
            } else {
                currentDueDate.setDate(currentDueDate.getDate() + 7)
            }

            installments.push({
                loanId: id,
                borrowerId: data.borrowerId,
                organizationId: data.organizationId,
                branchId: data.branchId,
                loanOfficerId: data.loanOfficerId,
                installmentNumber: i,
                dueDate: currentDueDate.toISOString().split('T')[0],
                expectedAmount: data.installmentAmount,
                paidAmount: 0,
                status: 'Unpaid'
            })
        }

        await tx.installment.createMany({
            data: installments
        })

        return loan
     })

     revalidatePath('/loans')
     revalidatePath(`/loans/${id}`)
     revalidatePath(`/borrowers/${data.borrowerId}`)
     
     return { success: true, loan: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
