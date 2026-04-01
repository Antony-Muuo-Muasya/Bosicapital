'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function registerBorrower(data: {
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  address: string;
  nationalId: string;
  dateOfBirth: string;
  gender: string;
  employmentStatus: string;
  monthlyIncome: number;
  businessPhotoUrl?: string;
  homeAssetsPhotoUrl?: string;
  loanApplicationUrl?: string;
  guarantorFormUrl?: string;
  photoUrl?: string;
  branchId: string;
  organizationId: string;
}) {
  try {
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    const borrowerId = `bor_${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
    const now = new Date().toISOString();

    // In raw Neon, transactions are managed via the driver if using a pool or specific client, 
    // but for simple atomic ops we can just run them sequentially if no complex rollback logic is needed,
    // OR use the .transaction method if supported by the adapter.
    
    // Note: Simple Neon doesn't have a broad $transaction like Prisma but we can ensure atomicity 
    // by using a single query block if the DB supports it, or sequential calls.
    
    await db(`
      INSERT INTO "User" (id, "fullName", email, password, "roleId", "organizationId", status, "branchIds", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    `, [userId, data.fullName, data.email, hashedPassword, 'borrower', data.organizationId, 'active', [data.branchId], now]);

    await db(`
      INSERT INTO "Borrower" (
        id, "userId", email, "fullName", phone, address, "nationalId", "dateOfBirth", 
        gender, "employmentStatus", "monthlyIncome", "businessPhotoUrl", "homeAssetsPhotoUrl", 
        "loanApplicationUrl", "guarantorFormUrl", "photoUrl", "branchId", "organizationId", 
        "registrationFeeRequired", "registrationFeeAmount", "registrationFeePaid"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      borrowerId, userId, data.email, data.fullName, data.phone, data.address, data.nationalId, data.dateOfBirth,
      data.gender, data.employmentStatus, data.monthlyIncome, data.businessPhotoUrl || '', data.homeAssetsPhotoUrl || '',
      data.loanApplicationUrl || '', data.guarantorFormUrl || '', data.photoUrl || '', data.branchId, data.organizationId,
      true, 800, false
    ]);

    revalidatePath('/borrowers');
    return { success: true };
  } catch (error: any) {
    console.error("Critical error in registerBorrower:", error);
    
    let message = error.message;
    if (message.includes('unique constraint') && message.includes('email')) {
      message = "This email is already registered.";
    } else if (message.includes('unique constraint') && message.includes('phone')) {
      message = "This phone number is already registered.";
    }
    
    return { success: false, error: message };
  }
}
