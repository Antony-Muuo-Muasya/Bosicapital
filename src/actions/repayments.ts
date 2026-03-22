'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getRepayments(organizationId: string, loanId?: string, borrowerId?: string) {
  try {
    const where: any = { organizationId }
    if (loanId) {
      where.loanId = loanId
    }
    if (borrowerId) {
      where.borrowerId = borrowerId
    }

    const repayments = await prisma.repayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        loan: {
          include: {
            loanProduct: true
          }
        },
        borrower: true
      }
    })
    return { success: true, repayments }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createRepayment(data: any) {
  try {
    const repayment = await prisma.repayment.create({
      data
    })

    // Update loan last payment date
    await prisma.loan.update({
        where: { id: data.loanId },
        data: { lastPaymentDate: data.paymentDate }
    })

    // Also need to update installments. 
    // This logic usually happens in the API route or a more complex service.
    // For now, let's just revalidate.

    revalidatePath('/repayments')
    revalidatePath(`/loans/${data.loanId}`)
    revalidatePath(`/borrowers/${data.borrowerId}`)
    
    return { success: true, repayment }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
