import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Diagnostic endpoint — checks which env vars are loaded at runtime
// Visit: https://bosicapital.com/api/payments/debug
export async function GET() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY || "";
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET || "";
  const passkey = process.env.MPESA_PASSKEY || process.env.PASSKEY || "";
  const shortCode = process.env.MPESA_SHORTCODE || "";
  const environment = process.env.MPESA_ENVIRONMENT || "";
  const callbackUrl = process.env.MPESA_CALLBACK_URL || "";

  return NextResponse.json({
    status: "ok",
    mpesa: {
      MPESA_CONSUMER_KEY: consumerKey ? `SET (${consumerKey.length} chars, starts: ${consumerKey.substring(0,4)}...)` : "❌ MISSING OR EMPTY",
      MPESA_CONSUMER_SECRET: consumerSecret ? `SET (${consumerSecret.length} chars, starts: ${consumerSecret.substring(0,4)}...)` : "❌ MISSING OR EMPTY",
      MPESA_PASSKEY: passkey ? `SET (${passkey.length} chars, starts: ${passkey.substring(0,4)}...)` : "❌ MISSING OR EMPTY",
      MPESA_SHORTCODE: shortCode || "❌ MISSING OR EMPTY",
      MPESA_ENVIRONMENT: environment || "❌ MISSING OR EMPTY",
      MPESA_CALLBACK_URL: callbackUrl || "❌ MISSING OR EMPTY",
    },
    readyForStkPush: !!(consumerKey && consumerSecret && passkey && shortCode),
  });
}
