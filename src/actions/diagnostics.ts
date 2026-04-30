'use server';

import { db } from '@/lib/db';

export async function getDiagnosticInfo() {
  const info: any = {
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      MPESA_CONSUMER_KEY: !!process.env.MPESA_CONSUMER_KEY,
      MPESA_CONSUMER_SECRET: !!process.env.MPESA_CONSUMER_SECRET,
      MPESA_PASSKEY: !!process.env.MPESA_PASSKEY,
      MPESA_SHORTCODE: !!process.env.MPESA_SHORTCODE,
      AFRICAS_TALKING_APIKEY: !!process.env.AFRICAS_TALKING_APIKEY,
      AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME || 'Not set',
    },
    mpesa: { status: 'Untested', detail: '' },
    callbacks: [],
  };

  // 1. Test M-Pesa Connectivity (Get Token)
  try {
    const consumerKey = (process.env.MPESA_CONSUMER_KEY || "").trim();
    const consumerSecret = (process.env.MPESA_CONSUMER_SECRET || "").trim();
    const env = (process.env.MPESA_ENVIRONMENT || 'production').trim();
    const authUrl = env === 'sandbox' 
      ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    if (consumerKey && consumerSecret) {
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const res = await fetch(authUrl, {
        headers: { Authorization: `Basic ${auth}` },
        cache: 'no-store'
      });
      if (res.ok) {
        info.mpesa.status = 'Connected ✅';
        info.mpesa.detail = 'Authentication Successful';
      } else {
        const err = await res.json().catch(() => ({}));
        info.mpesa.status = 'Authentication Failed ❌';
        info.mpesa.detail = JSON.stringify(err);
      }
    } else {
      info.mpesa.status = 'Misconfigured ⚠️';
      info.mpesa.detail = 'Keys missing in environment variables';
    }
  } catch (e: any) {
    info.mpesa.status = 'Network Error ❌';
    info.mpesa.detail = e.message;
  }

  // 2. Fetch Recent Callbacks (The "Handshake" History)
  try {
    info.callbacks = await db(`SELECT * FROM "MpesaCallback" ORDER BY "createdAt" DESC LIMIT 10`);
  } catch (e: any) {
    console.error("Failed to fetch callbacks:", e.message);
  }

  return info;
}
