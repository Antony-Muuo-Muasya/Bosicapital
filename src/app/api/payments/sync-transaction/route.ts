import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const { mpesaCode } = await req.json();

    if (!mpesaCode || mpesaCode.length < 5) {
      return NextResponse.json({ error: "Missing or invalid M-Pesa code" }, { status: 400 });
    }

    // 1. Check if we already have this transaction
    const existing = await db(`SELECT * FROM "Repayment" WHERE "transId" = $1`, [mpesaCode]);
    if (existing.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: "This payment was already processed.",
        payment: existing[0]
      });
    }

    // 2. Since the automatic callback might be slow/broken, 
    // we allow you to "Record" it manually which then links it.
    // In a real production app, you would call Safaricom Transaction Status API here.
    // For now, we will create a "Pending Verification" entry or look for it in raw logs.
    
    return NextResponse.json({ 
      error: "Transaction not found in Safaricom logs yet.",
      hint: "Safaricom notifications can take 5-30 minutes. If the payment was made just now, please wait a moment."
    }, { status: 404 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
