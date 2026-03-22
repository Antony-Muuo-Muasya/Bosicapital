'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getBorrowers(organizationId?: string, userId?: string) {
  try {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (userId) where.userId = userId;

    const borrowers = await prisma.borrower.findMany({
      where,
      orderBy: { fullName: 'asc' }
    })
    return { success: true, borrowers }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getBorrower(id: string) {
    try {
      const borrower = await prisma.borrower.findUnique({
        where: { id }
      })
      if (!borrower) return { success: false, error: 'Borrower not found' }
      return { success: true, borrower }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
}

export async function createBorrower(data: any) {
  try {
    const borrower = await prisma.borrower.create({
      data
    })
    revalidatePath('/borrowers')
    return { success: true, borrower }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateBorrower(id: string, data: any) {
  try {
    const borrower = await prisma.borrower.update({
      where: { id },
      data
    })
    revalidatePath('/borrowers')
    return { success: true, borrower }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBorrower(id: string) {
  try {
    await prisma.borrower.delete({
      where: { id }
    })
    revalidatePath('/borrowers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function payRegistrationFee(data: {
  organizationId: string;
  borrowerId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  collectedBy: string;
}) {
  try {
    const payment = await prisma.registrationPayment.create({
      data: {
        organizationId: data.organizationId,
        borrowerId: data.borrowerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        collectedBy: data.collectedBy,
      }
    });

    await prisma.borrower.update({
      where: { id: data.borrowerId },
      data: {
        registrationFeePaid: true,
        registrationFeePaidAt: new Date(),
        registrationPaymentId: payment.id,
      }
    });

    revalidatePath('/borrowers');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
