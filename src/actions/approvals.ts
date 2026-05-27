'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Updates the approval status of a loan.
 * Replacing Prisma logic with raw SQL for consistency and stability.
 */
export async function updateApprovalStatus(loanId: string, status: 'Approved' | 'Rejected', approverId: string) {
  try {
    const updatedLoan = await db(`
      UPDATE "Loan" 
      SET status = $2, 
          "approvedById" = $3
      WHERE id = $1
      RETURNING *
    `, [loanId, status, status === 'Approved' ? approverId : null]);

    // Revalidate relevant pages
    revalidatePath('/approvals')
    revalidatePath(`/loans/${loanId}`)

    return { success: true, data: updatedLoan[0] }
  } catch (error: any) {
    console.error('UpdateApprovalStatus error:', error)
    return { success: false, error: error.message || 'Failed to update approval status' }
  }
}
