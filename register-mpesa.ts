import { db } from './src/lib/db';

const DARAJA_URLS = {
  sandbox: "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
  production: "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
};

const REGISTER_URLS = {
  sandbox: "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
  production: "https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl",
};

async function register() {
  const consumerKey = (process.env.MPESA_CONSUMER_KEY || "").trim();
  const consumerSecret = (process.env.MPESA_CONSUMER_SECRET || "").trim();
  const shortCode = (process.env.MPESA_SHORTCODE || "4159879").trim();
  const callbackUrl = (process.env.MPESA_CALLBACK_URL || "").trim();
  const env = (process.env.MPESA_ENVIRONMENT || "production").trim() as 'sandbox' | 'production';

  if (!consumerKey || !consumerSecret || !callbackUrl) {
    console.error("Missing keys or callback URL.");
    process.exit(1);
  }

  console.log(`Attempting to register URLs for Paybill ${shortCode} on ${env}...`);
  console.log(`Confirmation URL: ${callbackUrl}`);

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(DARAJA_URLS[env], {
      headers: { Authorization: `Basic ${auth}` },
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    if (!token) throw new Error("Could not get access token");

    const res = await fetch(REGISTER_URLS[env], {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: shortCode,
        ResponseType: "Completed",
        ConfirmationURL: callbackUrl,
        ValidationURL: callbackUrl,
      }),
    });

    const data = await res.json();
    console.log("Registration Response:", JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (e) {
    console.error("Registration failed:", e);
    process.exit(1);
  }
}

register();
