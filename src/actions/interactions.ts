'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getInteractions(borrowerId: string) {
  try {
    const interactions = await prisma.interaction.findMany({
      where: { borrowerId },
      orderBy: { timestamp: 'desc' }
    })
    return { success: true, interactions }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createInteraction(data: {
  borrowerId: string;
  organizationId: string;
  branchId: string;
  recordedById: string;
  recordedByName: string;
  notes: string;
}) {
  try {
    const interaction = await prisma.interaction.create({
      data: {
        borrowerId: data.borrowerId,
        organizationId: data.organizationId,
        branchId: data.branchId,
        recordedById: data.recordedById,
        recordedByName: data.recordedByName,
        timestamp: new Date().toISOString(),
        notes: data.notes
      }
    })
    
    revalidatePath(`/borrowers/${data.borrowerId}`)
    return { success: true, interaction }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
