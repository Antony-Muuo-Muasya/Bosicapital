'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getLoanProducts(organizationId: string) {
  try {
    const products = await prisma.loanProduct.findMany({
      where: { organizationId }
    })
    return { success: true, products }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createLoanProduct(data: {
  name: string
  category: string
  minAmount: number
  maxAmount: number
  interestRate: number
  duration: number
  repaymentCycle: string
  processingFee?: number
  organizationId: string
}) {
  try {
    const product = await prisma.loanProduct.create({
      data
    })
    revalidatePath('/settings')
    return { success: true, product }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateLoanProduct(id: string, data: any) {
  try {
    const product = await prisma.loanProduct.update({
      where: { id },
      data
    })
    revalidatePath('/settings')
    return { success: true, product }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteLoanProduct(id: string) {
  try {
    await prisma.loanProduct.delete({
      where: { id }
    })
    revalidatePath('/settings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
