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

    // Step 1: Get token — read as text first to avoid JSON crash
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(DARAJA_URLS[env].auth, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    const tokenText = await tokenRes.text();
    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      return NextResponse.json({
        error: "Safaricom OAuth returned non-JSON. This usually means your credentials are wrong for the selected environment.",
        environment: env,
        httpStatus: tokenRes.status,
        rawResponse: tokenText.substring(0, 500),
        config,
        fix: env === "production"
          ? "Your Consumer Key/Secret might be SANDBOX credentials. Log into developer.safaricom.co.ke, go to your production app, and copy the production keys."
          : "Check your sandbox credentials on developer.safaricom.co.ke"
      }, { status: 400 });
    }

    if (!tokenData.access_token) {
      return NextResponse.json({
        error: "Failed to get M-Pesa access token.",
        environment: env,
        darajaResponse: tokenData,
        config,
        fix: env === "production"
          ? "Credentials rejected. Make sure you are using PRODUCTION Consumer Key/Secret from your live Daraja app."
          : "Check credentials on developer.safaricom.co.ke"
      }, { status: 401 });
    }

    // Step 2: Register URLs
    const registerRes = await fetch(DARAJA_URLS[env].register, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        ShortCode: shortCode,
        ResponseType: "Completed",
        ConfirmationURL: callbackUrl,
        ValidationURL: callbackUrl,
      }),
    });

    const registerText = await registerRes.text();
    let result: any;
    try {
      result = JSON.parse(registerText);
    } catch {
      return NextResponse.json({
        error: "Safaricom C2B register endpoint returned non-JSON.",
        environment: env,
        httpStatus: registerRes.status,
        rawResponse: registerText.substring(0, 500),
        config,
      }, { status: 400 });
    }

    // errorCode 401.003.01 = Invalid Access Token (wrong env credentials)
    if (result.errorCode === "401.003.01") {
      return NextResponse.json({
        error: "Safaricom rejected the access token with error 401.003.01.",
        meaning: "Your Consumer Key/Secret are SANDBOX credentials but MPESA_ENVIRONMENT is set to 'production'. You need to get your PRODUCTION credentials from developer.safaricom.co.ke under your live app.",
        steps: [
          "1. Go to https://developer.safaricom.co.ke and log in.",
          "2. Navigate to 'My Apps' and open your Production app.",
          "3. Copy the Production Consumer Key and Consumer Secret.",
          "4. Update MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in your Vercel environment variables.",
          "5. Redeploy, then visit this URL again."
        ],
        darajaResponse: result,
        config,
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "URLs registered successfully!",
      environment: env,
      callbackUrl,
      shortCode,
      result,
      config,
    });

  } catch (error: any) {
    console.error("URL Registration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
