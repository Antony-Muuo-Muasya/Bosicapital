import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  // List all available MPESA keys
  const allKeys = Object.keys(process.env).filter(key => key.startsWith("MPESA_") || key === "PASSKEY");

  // Fetch last 10 callbacks for status check
  const recentCallbacks = await db(`SELECT * FROM "MpesaCallback" ORDER BY id DESC LIMIT 10`, []);

  return NextResponse.json({
    status: "ok",
    mpesa: {
      MPESA_CONSUMER_KEY: consumerKey ? `SET (${consumerKey.length} chars)` : "❌ MISSING",
      MPESA_PASSKEY: passkey ? `SET (${passkey.length} chars)` : "❌ MISSING",
      MPESA_ENVIRONMENT: environment || "❌ MISSING",
      MPESA_CALLBACK_URL: callbackUrl || "❌ MISSING",
    },
    sms_provider: {
      username: process.env.AFRICAS_TALKING_USERNAME || "NOT SET",
      apiKey: process.env.AFRICAS_TALKING_APIKEY ? `SET (${process.env.AFRICAS_TALKING_APIKEY.length} chars)` : "❌ MISSING",
      isSandbox: (process.env.AFRICAS_TALKING_USERNAME || "").toLowerCase() === "sandbox"
    },
    detected_keys: allKeys,
    recent_callbacks: recentCallbacks,
    ready: !!(consumerKey && consumerSecret && passkey && shortCode),
  });
}
