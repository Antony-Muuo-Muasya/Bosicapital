'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getOrganization(id: string) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id }
    })
    return { success: true, organization: org }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateOrganization(id: string, data: any) {
  try {
    const org = await prisma.organization.update({
      where: { id },
      data
    })
    revalidatePath('/settings')
    return { success: true, organization: org }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
