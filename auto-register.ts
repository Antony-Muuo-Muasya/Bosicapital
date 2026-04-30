import fs from 'fs';
import path from 'path';

async function register() {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
  const envVars: any = {};
  envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length > 0) {
      envVars[key.trim()] = val.join('=').trim().replace(/"/g, '');
    }
  });

  const consumerKey = envVars.MPESA_CONSUMER_KEY;
  const consumerSecret = envVars.MPESA_CONSUMER_SECRET;
  const shortCode = envVars.MPESA_SHORTCODE;
  const callbackUrl = envVars.MPESA_CALLBACK_URL;
  const env = envVars.MPESA_ENVIRONMENT || 'production';

  console.log("Registering for:", { shortCode, callbackUrl, env });

  const authUrl = env === 'sandbox' 
    ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const registerUrl = env === 'sandbox'
    ? 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl'
    : 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl';

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(authUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });
    
    if (!tokenRes.ok) {
        console.error("Auth Failed:", await tokenRes.text());
        return;
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    const res = await fetch(registerUrl, {
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

    console.log("Registration Response:", await res.text());
  } catch (e: any) {
    console.error("Critical error:", e.message);
  }
}

register();
