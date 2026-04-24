import { NextResponse } from "next/server";

// To register your URLs, just run this GET endpoint in your browser:
// http://localhost:9003/api/payments/register-urls
// Remember to deploy YOUR SITE first, and change `BASE_URL` to your Vercel domain!

export async function GET(req: Request) {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;

    // Auto-detect BASE_URL
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const BASE_URL = process.env.MPESA_CALLBACK_URL?.replace('/api/payments/callback', '') || `${protocol}://${host}`;

    console.log(`[M-Pesa] Using BASE_URL for registration: ${BASE_URL}`);

    if (!consumerKey || !consumerSecret || !shortCode) {
      return NextResponse.json({ error: "Missing M-Pesa environment variables in .env" }, { status: 500 });
    }

    // 1. Generate M-Pesa Access Token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Failed to get access token", details: tokenData }, { status: 500 });
    }
    const accessToken = tokenData.access_token;

    // 2. Register Validation and Confirmation URLs
    const registerData = {
      ShortCode: shortCode,
      ResponseType: "Completed", // Safaricom should complete the transaction even if our validation fails
      ConfirmationURL: `${BASE_URL}/api/payments/callback`,
      ValidationURL: `${BASE_URL}/api/payments/callback`,
    };

    const registerRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      }
    );

    const result = await registerRes.json();
    return NextResponse.json({ success: true, message: "URLs registered successfully!", result });

  } catch (error: any) {
    console.error("URL Registration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
