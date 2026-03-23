'use server'

import prisma from '@/lib/db'

export async function getInstallmentsByOfficer(loanOfficerId: string) {
  if (!loanOfficerId) return []
  return prisma.installment.findMany({
    where: {
      loanOfficerId
    }
  })
}

export async function getAllInstallments() {
  return prisma.installment.findMany()
}
export async function getInstallments(organizationId?: string, loanId?: string) {
  return {
    success: true,
    installments: await prisma.installment.findMany({
      where: {
         ...(loanId ? { loanId } : {}),
      }
    })
  }
}
