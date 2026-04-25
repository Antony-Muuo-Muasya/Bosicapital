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

    // Step 2: Register URLs (Try v2 first)
    const registerV2Res = await fetch(DARAJA_URLS[env].register, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        ShortCode: shortCode,
        ResponseType: "Completed",
        ConfirmationURL: callbackUrl + "?type=conf",
        ValidationURL: callbackUrl + "?type=val",
      }),
    });

    let registerText = await registerV2Res.text();
    let result: any;
    try {
      result = JSON.parse(registerText);
    } catch {
      result = { error: "Non-JSON response from v2" };
    }

    // If v2 fails because of registration issues, try v1 as fallback
    if (result.errorCode === "500.003.1001" || registerV2Res.status !== 200) {
      console.log("v2 registration failed, trying v1 fallback...");
      const v1Url = DARAJA_URLS[env].register.replace("/v2/", "/v1/");
      const registerV1Res = await fetch(v1Url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          ShortCode: shortCode,
          ResponseType: "Completed",
          ConfirmationURL: callbackUrl + "?type=conf",
          ValidationURL: callbackUrl + "?type=val",
        }),
      });
      const v1Text = await registerV1Res.text();
      try {
        result = JSON.parse(v1Text);
      } catch {
        // stick with v2 result if v1 also crashes
      }
    }

    return NextResponse.json({
      success: true,
      message: "Registration attempted (v2 + v1 fallback).",
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
