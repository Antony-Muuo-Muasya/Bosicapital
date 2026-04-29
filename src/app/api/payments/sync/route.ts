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
       const mId = rawMatches[0].id;
       const status = rawMatches[0].status;

       if (status === 'Processed') {
          return NextResponse.json({ error: "This transaction is already marked as Processed." }, { status: 400 });
       }

       // Let's actually TRY to process it now using a dedicated POST call to our own callback endpoint or just re-using the logic
       // Since we are in the same environment, we can just call our processing route logic!
       // But wait, the easiest way to "Fix" it for the user is to trigger a POST to /api/payments/callback with the data from rawMatch
       
       try {
         const data = rawMatches[0];
         // We construct a payload similar to what Safaricom sends
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

         // We call the internal POST route
         const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'https://bosicapital.com');
         
         const callbackRes = await fetch(`${baseUrl}/api/payments/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
         });

         const result = await callbackRes.json();
         
         // Re-check if it's processed now
         const updated = await db(`SELECT status, "errorMessage" FROM "MpesaCallback" WHERE id = $1`, [mId]);
         
         if (updated[0]?.status === 'Processed') {
            return NextResponse.json({ 
              success: true, 
              message: "Transaction found and processed successfully!" 
            });
         } else {
            return NextResponse.json({ 
              error: "Found in logs but matching still failed.", 
              detail: updated[0]?.errorMessage || "Could not match to a loan or registration fee."
            }, { status: 400 });
         }

       } catch (err: any) {
         return NextResponse.json({ error: "Failed to re-process: " + err.message }, { status: 500 });
       }
    }

    return NextResponse.json({ 
      error: "Safaricom hasn't sent this code yet.",
      steps: "Wait 2-5 minutes and try again. If it still fails, you may need to record it manually."
    }, { status: 404 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
