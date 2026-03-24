'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Updates the approval status of a loan in Prisma.
 * This replaces the old Firebase/Firestore update logic.
 */
export async function updateApprovalStatus(loanId: string, status: 'Approved' | 'Rejected', approverId: string) {
  try {
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: status,
        approvedById: status === 'Approved' ? approverId : undefined,
      },
    })

    // Revalidate relevant pages
    revalidatePath('/approvals')
    revalidatePath(`/loans/${loanId}`)

    return { success: true, data: updatedLoan }
  } catch (error: any) {
    console.error('Prisma updateApprovalStatus error:', error)
    return { success: false, error: error.message || 'Failed to update approval status' }
  }
}
