'use server';

import prisma from "@/lib/db";

export async function getRoles(organizationId: string) {
  try {
    const roles = await prisma.role.findMany({
      where: {
        organizationId: organizationId,
      },
    });
    return { success: true, roles };
  } catch (error: any) {
    console.error("Failed to fetch roles:", error);
    return { success: false, error: error.message };
  }
}
