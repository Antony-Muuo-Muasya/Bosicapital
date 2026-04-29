import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DARAJA_URLS = {
  sandbox: {
    auth: "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    stk: "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
  },
  production: {
    auth: "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    stk: "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
  },
};

export async function POST(req: Request) {
  try {
    const { phone, amount, loanId, nationalId } = await req.json();

    if (!phone || !amount || !loanId) {
      return NextResponse.json({ error: "Missing required fields: phone, amount, or loanId" }, { status: 400 });
    }

    // FIX 1: Trim all env vars to avoid whitespace issues from "Needs Attention" Vercel warnings
    const consumerKey = (process.env.MPESA_CONSUMER_KEY || "").trim();
    const consumerSecret = (process.env.MPESA_CONSUMER_SECRET || "").trim();
    const shortCode = (process.env.MPESA_SHORTCODE || "4159879").trim();
    const env = ((process.env.MPESA_ENVIRONMENT || "production").trim()) as "sandbox" | "production";

    if (!consumerKey || !consumerSecret) {
      console.error("[STK Push] Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET");
      return NextResponse.json({ error: "Server M-Pesa credentials are not configured" }, { status: 500 });
    }

    // Passkey: Support both MPESA_PASSKEY and the legacy PASSKEY name from older examples
    let passkey = (process.env.MPESA_PASSKEY || process.env.PASSKEY || "").trim();
    const SANDBOX_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    
    if (!passkey) {
      if (env === "sandbox") {
        passkey = SANDBOX_PASSKEY;
        console.warn("[STK Push] MPESA_PASSKEY not set — using default sandbox passkey");
      } else {
        console.error("[STK Push] MPESA_PASSKEY is EMPTY in production Vercel env vars.",
          "Key length:", consumerKey.length, "Secret length:", consumerSecret.length);
        return NextResponse.json({
          error: "MPESA_PASSKEY is not configured on the server. Please add it in Vercel → Settings → Environment Variables, then REDEPLOY.",
        }, { status: 500 });
      }
    }
    console.log("[STK Push] Passkey loaded, length:", passkey.length, "env:", env);

    // FIX 3: Build the callback URL directly — do NOT use string replace (it breaks if URL format changes)
    const baseUrl = (process.env.MPESA_CALLBACK_URL || "https://bosicapital.com/api/payments/callback")
      .trim()
      .replace(/\/$/, ""); // strip trailing slash
    // Always point to /stk-callback regardless of what MPESA_CALLBACK_URL is set to
    const callbackUrl = baseUrl.includes("stk-callback")
      ? baseUrl
      : baseUrl.replace(/\/callback$/, "/stk-callback");

    // FIX 4: Robust phone number formatting — handle 07xx, 254xx, +254xx, 7xx
    let formattedPhone = phone.toString().replace(/\s+/g, "").replace(/^\+/, "").trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("7") && formattedPhone.length === 9) {
      formattedPhone = "254" + formattedPhone;
    }
    // Validate final format: must be 12 digits starting with 254
    if (!/^254\d{9}$/.test(formattedPhone)) {
      return NextResponse.json({ error: `Invalid phone number format: ${phone}. Use format 07XXXXXXXX.` }, { status: 400 });
    }

    // FIX 5: Amount must be a whole integer (Safaricom rejects decimals)
    const amountInt = Math.ceil(Number(amount));
    if (isNaN(amountInt) || amountInt < 1) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    // AccountReference: Strictly use National ID (Id Number) for standardized matching. Max 12 chars.
    const accountRef = (nationalId || "").toString().replace(/[^a-zA-Z0-9]/g, "").substring(0, 12) || "BosCapital";

    // FIX 7: TransactionDesc max 13 chars (Safaricom strict limit)
    const transDesc = "LoanRepayment";

    // 1. Get OAuth token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(DARAJA_URLS[env].auth, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text().catch(() => "");
      console.error("[STK Push] Token fetch failed:", tokenRes.status, tokenErr);
      return NextResponse.json({ error: "Failed to connect to Safaricom. Check your Consumer Key/Secret.", detail: tokenErr }, { status: 502 });
    }

    const tokenData = await tokenRes.json().catch(() => null);
    if (!tokenData?.access_token) {
      console.error("[STK Push] No access_token in token response:", tokenData);
      return NextResponse.json({ error: "Safaricom authentication failed. Credentials may be wrong.", detail: tokenData }, { status: 401 });
    }

    // 2. Generate password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    // 3. Send STK Push
    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amountInt,
      PartyA: formattedPhone,
      PartyB: shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: transDesc,
    };

    console.log("[STK Push] Sending to Safaricom:", JSON.stringify({ ...stkPayload, Password: "***" }));

    const stkRes = await fetch(DARAJA_URLS[env].stk, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json().catch(() => null);
    console.log("[STK Push] Safaricom response:", JSON.stringify(stkData));

    if (stkData?.ResponseCode === "0") {
      // SAVE THE CHECKOUT REQUEST ID TO DB! 
      // This is the "secret sauce" to matching payments even if the user pays with a different phone number.
      try {
        const mpcId = `mpc_stk_${Date.now()}`;
        await db(
          `INSERT INTO "MpesaCallback" (
            id, "checkoutRequestId", msisdn, "transAmount", status, "transactionType", "billRefNumber"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            mpcId, 
            stkData.CheckoutRequestID, 
            formattedPhone, 
            String(amountInt), 
            "Requested", 
            "STK Push", 
            accountRef
          ]
        );
        console.log("[STK Push] Saved checkout request:", stkData.CheckoutRequestID, "for account:", accountRef);
      } catch (dbErr: any) {
        console.error("[STK Push] Failed to save checkout request to DB:", dbErr.message);
      }

      return NextResponse.json({
        success: true,
        message: "STK Push sent! Please check your phone and enter your M-Pesa PIN.",
        checkoutRequestId: stkData.CheckoutRequestID,
      });
    } else {
      const errMsg = stkData?.errorMessage || stkData?.ResponseDescription || stkData?.CustomerMessage || "STK Push rejected by Safaricom";
      console.error("[STK Push] Rejected:", stkData);
      return NextResponse.json({ error: errMsg, detail: stkData }, { status: 400 });
    }

  } catch (error: any) {
    console.error("[STK Push] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Unexpected server error" }, { status: 500 });
  }
}
