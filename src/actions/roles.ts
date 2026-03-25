'use server';

import prisma from "@/lib/db";

import { unstable_cache } from "next/cache";

export const getRoles = unstable_cache(
  async (organizationId: string) => {
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
  },
  ['roles-lookup'],
  { revalidate: 3600, tags: ['roles'] }
);
