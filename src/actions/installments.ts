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

export async function updateInstallment(id: string, data: any) {
  return prisma.installment.update({
    where: { id },
    data
  })
}
