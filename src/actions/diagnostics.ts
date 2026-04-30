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
      info.mpesa.detail = 'Keys missing';
    }
  } catch (e: any) {
    info.mpesa.status = 'Error ❌';
    info.mpesa.detail = e.message;
  }

  try {
    info.callbacks = await db(`SELECT * FROM "MpesaCallback" ORDER BY "createdAt" DESC LIMIT 10`);
  } catch (e: any) {
    console.error("Failed to fetch callbacks:", e.message);
  }

  return info;
}

export async function manualRecon(payload: {
  transId: string;
  msisdn: string;
  amount: number;
  billRef: string;
}) {
  try {
    const { transId, msisdn, amount, billRef } = payload;
    
    // 1. Create a "virtual" callback record
    const mId = `manual_${Date.now()}_${transId}`;
    await db(
      `INSERT INTO "MpesaCallback" (
        id, "transId", msisdn, "transAmount", "billRefNumber", 
        status, "transactionType", "errorMessage", "createdAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [mId, transId, msisdn, String(amount), billRef, 'Manual_Pending', 'Manual Reconciliation', 'Manually entered by admin', new Date()]
    );

    // 2. Trigger the callback processing logic via an internal POST request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bosicapital.com';
    const callbackPayload = {
      TransactionType: "Pay Bill",
      TransID: transId,
      TransTime: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
      TransAmount: String(amount),
      BusinessShortCode: process.env.MPESA_SHORTCODE || '4159879',
      BillRefNumber: billRef,
      MSISDN: msisdn,
      FirstName: "Manual",
      MiddleName: "Entry",
      LastName: "Admin"
    };

    const res = await fetch(`${baseUrl}/api/payments/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackPayload)
    });

    const result = await res.json();
    return { success: true, message: "Transaction processed and matched!" };

  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function testSMS(phone: string) {
  try {
    const { sendSMS } = await import('@/lib/sms');
    const result = await sendSMS(phone, "Bosi Capital: This is a system test message. If you see this, your SMS integration is working!");
    return result;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
