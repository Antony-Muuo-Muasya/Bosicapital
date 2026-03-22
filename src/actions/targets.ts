'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getTargets(organizationId: string) {
  try {
    const targets = await prisma.target.findMany({
      where: { organizationId }
    })
    return { success: true, targets }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createMultipleTargets(targets: any[]) {
  try {
    const results = await Promise.all(
        targets.map(data => prisma.target.create({ data }))
    )
    revalidatePath('/settings')
    return { success: true, count: results.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createTarget(data: {
  organizationId: string
  branchId: string
  userId?: string
  name: string
  type: string
  value: number
  startDate: string
  endDate: string
}) {
  try {
    const target = await prisma.target.create({
      data
    })
    revalidatePath('/settings')
    return { success: true, target }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTarget(id: string, data: any) {
  try {
    const target = await prisma.target.update({
      where: { id },
      data
    })
    revalidatePath('/settings')
    return { success: true, target }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteTarget(id: string) {
  try {
    await prisma.target.delete({
      where: { id }
    })
    revalidatePath('/settings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
