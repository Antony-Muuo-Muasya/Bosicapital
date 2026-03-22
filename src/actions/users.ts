'use server';

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUsers(organizationId: string, roleId?: string) {
  try {
    const where: any = {};
    if (organizationId !== 'system') {
      where.organizationId = organizationId;
    }
    
    // Add any specific role filters
    if (roleId === 'admin' || roleId === 'manager') {
       // Only get users in their organization
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return { success: true, users };
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        organization: true,
      }
    });
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return { success: true, user };
  } catch (error: any) {
    console.error("Failed to fetch user profile:", error);
    return { success: false, error: error.message };
  }
}

export async function createUser(data: {
  fullName: string;
  email: string;
  password?: string;
  roleId: string;
  organizationId: string;
  status: 'active' | 'suspended';
  branchIds?: string[];
}) {
  try {
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId,
        organizationId: data.organizationId,
        status: data.status,
        branchIds: data.branchIds || [],
      } as any
    });
    
    revalidatePath('/users');
    return { success: true, user };
  } catch (error: any) {
    console.error("Failed to create user in Prisma:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUser(id: string, data: {
  fullName?: string;
  roleId?: string;
  status?: string;
  branchIds?: string[];
}) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        roleId: data.roleId,
        status: data.status,
        branchIds: data.branchIds,
      }
    });
    
    revalidatePath('/users');
    return { success: true, user };
  } catch (error: any) {
    console.error("Failed to update user in Prisma:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id }
    });
    
    revalidatePath('/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user in Prisma:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePassword(userId: string, data: { currentPassword?: string, newPassword: string }) {
  try {
     const user = await prisma.user.findUnique({
       where: { id: userId }
     });

     if (!user) {
       return { success: false, error: 'User not found' };
     }

     if (data.currentPassword && (user as any).password) {
        const isPasswordValid = await bcrypt.compare(data.currentPassword, (user as any).password);
        if (!isPasswordValid) {
          return { success: false, error: 'Incorrect current password' };
        }
     }

     const hashedPassword = await bcrypt.hash(data.newPassword, 10);
     await prisma.user.update({
       where: { id: userId },
       data: { password: hashedPassword } as any
     });

     return { success: true };
  } catch (error: any) {
    console.error("Failed to update password:", error);
    return { success: false, error: error.message };
  }
}

export async function getRoles(organizationId: string, isSuperAdmin: boolean) {
  try {
    const where: any = {};
    // Ideally we fetch generic roles and org specific roles
    if (!isSuperAdmin) {
      where.OR = [
        { organizationId: organizationId },
        { organizationId: 'system' },
        { organizationId: null }
      ];
    }
    const roles = await prisma.role.findMany({
      where
    });
    return { success: true, roles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBranches(organizationId: string, isSuperAdmin: boolean) {
  try {
    const where: any = {};
    if (!isSuperAdmin) {
      where.organizationId = organizationId;
    }
    const branches = await prisma.branch.findMany({
      where
    });
    return { success: true, branches };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signupUser(data: { fullName: string, email: string, password?: string, organizationName: string }) {
    try {
        const result = await prisma.$transaction(async (tx) => {
             // 1. Seed Roles if they don't exist
             const rolesCount = await tx.role.count();
             if (rolesCount === 0) {
                 const rolesToSeed = [
                    { id: 'superadmin', name: 'CEO / Business Developer', systemRole: true, permissions: ['*'], organizationId: 'system' },
                    { id: 'admin', name: 'Head of Operations', systemRole: true, permissions: ['user.create', 'user.edit', 'user.delete', 'user.view', 'role.manage', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'], organizationId: 'system' },
                    { id: 'manager', name: 'Manager / Head of Product', systemRole: true, permissions: ['user.view', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'], organizationId: 'system' },
                    { id: 'loan_officer', name: 'Loan Officer / Call Center', systemRole: true, permissions: ['loan.create', 'loan.view', 'repayment.create'], organizationId: 'system' },
                    { id: 'user', name: 'Borrower', systemRole: true, permissions: ['borrower.view.own'], organizationId: 'system' },
                 ];
                 await tx.role.createMany({ data: rolesToSeed });
             }

             // 2. Create Organization
             const organization = await tx.organization.create({
                 data: {
                     name: data.organizationName,
                     createdAt: new Date().toISOString()
                 }
             });

             // 3. Create Main Branch
             const branch = await tx.branch.create({
                 data: {
                     name: 'Headquarters',
                     location: 'Main Office',
                     isMain: true,
                     organizationId: organization.id
                 }
             });

             // 4. Create User
             const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;
             const user = await tx.user.create({
                 data: {
                     fullName: data.fullName,
                     email: data.email,
                     password: hashedPassword,
                     roleId: 'superadmin',
                     organizationId: organization.id,
                     branchIds: [branch.id],
                     status: 'active',
                     createdAt: new Date()
                 } as any
             });

             return user;
        });

        return { success: true, user: result };
    } catch (error: any) {
        console.error("Signup failed:", error);
        return { success: false, error: error.message };
    }
}
