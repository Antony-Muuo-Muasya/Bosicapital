'use server'

import prisma from '@/lib/db'

export const getInstallments = async (organizationId?: string, loanId?: string, dueDate?: string) => {
  return {
    success: true,
    installments: await prisma.installment.findMany({
      where: {
         ...(loanId ? { loanId } : {}),
         ...(organizationId ? { organizationId } : {}),
         ...(dueDate ? { dueDate } : {}),
      }
    })
  }
}

export const getInstallmentsByOfficer = async (loanOfficerId: string) => {
  if (!loanOfficerId) return []
  return prisma.installment.findMany({
    where: {
      loanOfficerId
    }
  })
}

export const getAllInstallments = async () => {
  return prisma.installment.findMany()
}

