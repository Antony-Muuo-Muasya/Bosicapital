'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUsers(organizationId: string, roleId?: string, branchId?: string) {
  try {
    let query = `
      SELECT u.*, r.name as "roleName", r."systemRole" as "roleSystemRole"
      FROM "User" u
      LEFT JOIN "Role" r ON u."roleId" = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (organizationId !== 'system') {
      query += ` AND u."organizationId" = $${params.length + 1}`;
      params.push(organizationId);
    }

    if (branchId) {
      query += ` AND $${params.length + 1} = ANY(u."branchIds")`;
      params.push(branchId);
    }

    query += ` ORDER BY u."createdAt" DESC`;

    const usersRaw = await db(query, params);
    
    const users = usersRaw.map((u: any) => ({
      ...u,
      role: {
        id: u.roleId,
        name: u.roleName,
        systemRole: u.roleSystemRole
      }
    }));

    return { success: true, users };
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserProfile(userId: string) {
  try {
    const users = await db(`
      SELECT u.*, 
             r.name as "roleName", r."systemRole" as "roleSystemRole",
             o.name as "orgName"
      FROM "User" u
      LEFT JOIN "Role" r ON u."roleId" = r.id
      LEFT JOIN "Organization" o ON u."organizationId" = o.id
      WHERE u.id = $1
    `, [userId]);
    
    const u = users[0];
    if (!u) {
      return { success: false, error: 'User not found' };
    }
    
    const user: any = {
      ...u,
      role: { id: u.roleId, name: u.roleName, systemRole: u.roleSystemRole },
      organization: { id: u.organizationId, name: u.orgName }
    };
    
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
    const id = `user_${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
    const createdAt = new Date().toISOString();

    await db(`
      INSERT INTO "User" (id, "fullName", email, password, "roleId", "organizationId", status, "branchIds", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    `, [
      id,
      data.fullName,
      data.email,
      hashedPassword,
      data.roleId,
      data.organizationId,
      data.status,
      data.branchIds || [],
      createdAt
    ]);
    
    revalidatePath('/users');
    return { success: true, user: { id, email: data.email, fullName: data.fullName } };
  } catch (error: any) {
    console.error("Failed to create user:", error);
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
    const updatedAt = new Date().toISOString();
    
    await db(`
      UPDATE "User"
      SET "fullName" = COALESCE($2, "fullName"),
          "roleId" = COALESCE($3, "roleId"),
          status = COALESCE($4, status),
          "branchIds" = COALESCE($5, "branchIds"),
          "updatedAt" = $6
      WHERE id = $1
    `, [id, data.fullName, data.roleId, data.status, data.branchIds, updatedAt]);
    
    revalidatePath('/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(id: string) {
  try {
    await db(`DELETE FROM "User" WHERE id = $1`, [id]);
    revalidatePath('/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return { success: false, error: error.message };
  }
}

export async function getRoles(organizationId: string, isSuperAdmin: boolean) {
  try {
    let query = `SELECT * FROM "Role" WHERE 1=1`;
    const params: any[] = [];
    
    if (!isSuperAdmin) {
      query += ` AND ("organizationId" = $1 OR "organizationId" = 'system' OR "organizationId" IS NULL)`;
      params.push(organizationId);
    }
    
    const roles = await db(query, params);
    return { success: true, roles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBranches(organizationId: string, isSuperAdmin: boolean) {
  try {
    let query = `SELECT * FROM "Branch" WHERE 1=1`;
    const params: any[] = [];
    
    if (!isSuperAdmin) {
      query += ` AND "organizationId" = $1`;
      params.push(organizationId);
    }
    
    const branches = await db(query, params);
    return { success: true, branches };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePassword(userId: string, data: { currentPassword?: string, newPassword: string }) {
  try {
    const users = await db(`SELECT password FROM "User" WHERE id = $1`, [userId]);
    const user = users[0];

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (data.currentPassword && user.password) {
      const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isPasswordValid) {
        return { success: false, error: 'Incorrect current password' };
      }
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    const updatedAt = new Date().toISOString();

    await db(`UPDATE "User" SET password = $2, "updatedAt" = $3 WHERE id = $1`, [userId, hashedPassword, updatedAt]);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update password:", error);
    return { success: false, error: error.message };
  }
}
