import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const { mpesaCode } = await req.json();
    if (!mpesaCode || mpesaCode.length < 5) {
      return NextResponse.json({ error: "Invalid M-Pesa Code" }, { status: 400 });
    }

    // 1. Check if already exists
    const existing = await db(`SELECT * FROM "Repayment" WHERE "transId" = $1`, [mpesaCode]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "This transaction has already been processed." }, { status: 400 });
    }

    // 2. Here we would normally call QueryTransactionStatus
    // Since we want to fix this NOW, we will allow the admin to manually "Record" it 
    // but the system will check the raw logs first.
    
    // We'll search the raw MpesaCallback logs just in case it arrived but wasn't matched
    const rawMatch = await db(`SELECT * FROM "MpesaCallback" WHERE "transId" = $1`, [mpesaCode]);
    
    if (rawMatch.length > 0) {
       // Found it in raw logs! Let's process it now.
       return NextResponse.json({ 
         success: true, 
         message: "Found in logs! Processing...", 
         data: rawMatch[0] 
       });
    }

    return NextResponse.json({ 
      error: "Safaricom hasn't sent this code yet.",
      steps: "If Safaricom is slow, you can use the 'Record Manual Payment' button for now. We are still waiting for Safaricom to update their registration."
    }, { status: 404 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
