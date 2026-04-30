import fs from 'fs';
import path from 'path';

async function register() {
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const envVars: any = {};
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        envVars[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/"/g, '');
      }
    });

    const consumerKey = envVars.MPESA_CONSUMER_KEY;
    const consumerSecret = envVars.MPESA_CONSUMER_SECRET;
    const shortCode = envVars.MPESA_SHORTCODE;
    const callbackUrl = 'https://bosicapital.com/api/payments/callback';
    const env = envVars.MPESA_ENVIRONMENT || 'production';

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const authUrl = env === 'sandbox' 
      ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    console.log("Fetching token...");
    const tRes = await fetch(authUrl, { headers: { Authorization: `Basic ${auth}` } });
    const tData = await tRes.json();
    
    if (!tData.access_token) {
        console.error("No token:", tData);
        return;
    }

    console.log("Registering URL...");
    const rUrl = env === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl'
      : 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl';

    const rRes = await fetch(rUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: shortCode,
        ResponseType: "Completed",
        ConfirmationURL: callbackUrl,
        ValidationURL: callbackUrl,
      }),
    });

    const rData = await rRes.json();
    console.log("RESULT:", JSON.stringify(rData));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
register();
