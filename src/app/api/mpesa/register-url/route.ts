import { NextResponse } from "next/server";

const DARAJA_URLS = {
  sandbox: {
    auth: "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    register: "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
  },
  production: {
    auth: "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    register: "https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl",
  },
};

async function getDarajaAccessToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const env = (process.env.MPESA_ENVIRONMENT || "sandbox") as "sandbox" | "production";

  if (!consumerKey || !consumerSecret) {
    throw new Error("MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not set in .env");
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await fetch(DARAJA_URLS[env].auth, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get Daraja access token: ${response.status} - ${body}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(`Access token missing in Daraja response: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * GET /api/mpesa/register-url
 *
 * Registers your callback URL with Safaricom Daraja C2B API.
 * Only needs to be called ONCE to activate the webhook.
 * Protect this endpoint or call it from a secure admin action.
 */
export async function GET(req: Request) {
  // Basic security: Only allow requests with a secret header
  const authHeader = req.headers.get("x-admin-secret");
  const expectedSecret = process.env.NEXTAUTH_SECRET;

  if (!authHeader || authHeader !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized. Provide the correct x-admin-secret header." },
      { status: 401 }
    );
  }

  const shortCode = process.env.MPESA_SHORTCODE;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  const env = (process.env.MPESA_ENVIRONMENT || "sandbox") as "sandbox" | "production";

  if (!shortCode || !callbackUrl) {
    return NextResponse.json(
      { error: "MPESA_SHORTCODE or MPESA_CALLBACK_URL is not set in .env" },
      { status: 500 }
    );
  }

  if (callbackUrl.includes("your-domain.com") || callbackUrl.includes("ngrok.io")) {
    return NextResponse.json(
      {
        error:
          "MPESA_CALLBACK_URL still has the placeholder value. Update it to your real public URL first.",
      },
      { status: 400 }
    );
  }

  try {
    console.log(`[M-Pesa] Getting Daraja access token (${env})...`);
    const accessToken = await getDarajaAccessToken();

    console.log(`[M-Pesa] Registering callback URL: ${callbackUrl}`);
    const registerResponse = await fetch(DARAJA_URLS[env].register, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: shortCode,
        ResponseType: "Completed", // 'Completed' = confirm all, 'Cancelled' = reject mismatches
        ConfirmationURL: callbackUrl,
        ValidationURL: callbackUrl,
      }),
    });

    const registerData = await registerResponse.json();
    console.log("[M-Pesa] Registration response:", registerData);

    if (registerData.ResponseCode === "0" || registerData.ResponseDescription?.toLowerCase().includes("success")) {
      return NextResponse.json({
        success: true,
        message: "✅ Callback URL registered successfully with Safaricom!",
        environment: env,
        shortCode,
        callbackUrl,
        darajaResponse: registerData,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Safaricom returned a non-success response.",
      darajaResponse: registerData,
    });
  } catch (error: any) {
    console.error("[M-Pesa] URL Registration Error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
