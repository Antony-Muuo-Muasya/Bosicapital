'use server'

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

import { unstable_cache } from "next/cache";

export const getBranches = unstable_cache(
  async (organizationId: string) => {
    try {
      const branches = await prisma.branch.findMany({
        where: { organizationId }
      });
      return { success: true, branches };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
  ['branches-lookup'],
  { revalidate: 3600, tags: ['branches'] }
);

export async function createBranch(data: { name: string, location: string, organizationId: string }) {
  try {
    const branch = await prisma.branch.create({
      data: {
        name: data.name,
        location: data.location,
        organizationId: data.organizationId,
        isMain: false
      }
    });
    
    revalidatePath('/dashboard');
    revalidatePath('/branches');
    revalidatePath('/settings');
    return { success: true, branch };
  } catch (error: any) {
    console.error("Failed to create branch:", error);
    return { success: false, error: error.message };
  }
}

export async function updateBranch(id: string, data: { name?: string, location?: string, isMain?: boolean }) {
  try {
    const branch = await prisma.branch.update({
      where: { id },
      data
    });
    revalidatePath('/settings');
    return { success: true, branch };
  } catch (error: any) {
    console.error("Failed to update branch:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBranch(id: string) {
  try {
    await prisma.branch.delete({
      where: { id }
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete branch:", error);
    return { success: false, error: error.message };
  }
}
