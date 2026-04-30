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

    // 2. Search raw logs
    const rawMatches = await db(`SELECT * FROM "MpesaCallback" WHERE "transId" = $1 ORDER BY id DESC`, [mpesaCode]);
    
    if (rawMatches.length > 0) {
       // ... (existing logic for when log exists)
       const data = rawMatches[0];
       const payload = {
          TransactionType: data.transactionType || "Pay Bill",
          TransID: data.transId,
          TransTime: data.transTime,
          TransAmount: data.transAmount,
          BusinessShortCode: data.businessShortCode,
          BillRefNumber: data.billRefNumber,
          MSISDN: data.msisdn,
          FirstName: data.firstName,
          MiddleName: data.middleName,
          LastName: data.lastName
       };

       const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'https://bosicapital.com');
       const callbackRes = await fetch(`${baseUrl}/api/payments/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
       });
       const result = await callbackRes.json();
       
       const updated = await db(`SELECT status, "errorMessage" FROM "MpesaCallback" WHERE "transId" = $1`, [mpesaCode]);
       if (updated[0]?.status === 'Processed') {
          return NextResponse.json({ success: true, message: "Transaction found and processed!" });
       } else {
          return NextResponse.json({ error: "Found in logs but matching failed.", detail: updated[0]?.errorMessage }, { status: 400 });
       }
    }

    // NEW: FORCE SYNC FALLBACK
    // If the code is NOT in the logs, we can still try to process it if we have a borrower who paid a similar amount recently
    // But better yet: let's allow the admin to "Claim" this code for a specific borrower
    return NextResponse.json({ 
      error: "Code not found in server logs.", 
      canForce: true,
      message: "Safaricom never sent this notification. Would you like to manually link this code to a borrower?" 
    }, { status: 404 });


  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
