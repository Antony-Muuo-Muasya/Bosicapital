export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

const DARAJA_URLS = {
  sandbox: {
    auth: "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    register: "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
  },
  production: {
    auth: "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    register: "https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl",
  },
};

export async function GET(req: Request) {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const env = (process.env.MPESA_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    const callbackUrl = process.env.MPESA_CALLBACK_URL || "https://bosicapital.com/api/payments/callback";

    // Show current config for debugging
    const config = {
      environment: env,
      shortCode,
      callbackUrl,
      consumerKeyPrefix: consumerKey ? consumerKey.substring(0, 8) + "..." : "NOT SET",
    };

    if (!consumerKey || !consumerSecret || !shortCode) {
      return NextResponse.json({
        error: "Missing M-Pesa environment variables.",
        config
      }, { status: 500 });
    }

    // Step 1: Get token
    const auth = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString("base64");
    const tokenRes = await fetch(DARAJA_URLS[env].auth, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    const tokenText = await tokenRes.text();
    let tokenData: any;
    try { tokenData = JSON.parse(tokenText); } catch { tokenData = { error: "OAuth failed", raw: tokenText.substring(0, 50) }; }

    if (!tokenData.access_token) {
      return NextResponse.json({ error: "Auth Failed", daraja: tokenData, config }, { status: 401 });
    }

    const sCode = (shortCode || "4159879").toString().trim();
    const cUrl = (callbackUrl || "https://bosicapital.com/api/payments/callback").trim();

    // FORCE RESET: Try registering a 'dummy' URL first to clear Safaricom's cache
    await fetch(DARAJA_URLS[env].register, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ShortCode: sCode,
        ResponseType: "Completed",
        ConfirmationURL: "https://bosicapital.com/api/mpesa/reset",
        ValidationURL: "https://bosicapital.com/api/mpesa/reset",
      }),
    });

    // NOW REGISTER THE REAL ONE
    const v2Res = await fetch(DARAJA_URLS[env].register, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ShortCode: sCode,
        ResponseType: "Completed",
        ConfirmationURL: cUrl,
        ValidationURL: cUrl,
      }),
    });
    const v2Result = await v2Res.json().catch(() => ({ error: "V2 JSON failed" }));


    // Fallback to V1
    let v1Result = null;
    if (v2Result.errorCode === "401.003.01" || v2Result.errorCode === "500.003.1001" || v2Res.status !== 200) {
      const v1Res = await fetch(DARAJA_URLS[env].register.replace("/v2/", "/v1/"), {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ShortCode: sCode,
          ResponseType: "Completed",
          ConfirmationURL: cUrl,
          ValidationURL: cUrl,
        }),
      });
      v1Result = await v1Res.json().catch(() => ({ error: "V1 JSON failed" }));
    }

    return NextResponse.json({
      status: "SYSTEM_SYNC_READY_V3",
      environment: env,
      shortCode: sCode,
      v2: v2Result,
      v1: v1Result
    });




  } catch (error: any) {
    console.error("URL Registration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
