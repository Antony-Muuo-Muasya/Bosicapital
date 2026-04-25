import { NextResponse } from "next/server";

const DARAJA_URLS = {
  sandbox: {
    auth: "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    stk: "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
  },
  production: {
    auth: "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    stk: "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
  },
};

export async function POST(req: Request) {
  try {
    const { phone, amount, loanId } = await req.json();

    if (!phone || !amount || !loanId) {
      return NextResponse.json({ error: "Missing required fields: phone, amount, or loanId" }, { status: 400 });
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE || "4159879";
    const passkey = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // Default sandbox passkey
    const env = (process.env.MPESA_ENVIRONMENT || "production") as "sandbox" | "production";
    
    // Need a specific STK callback URL
    const callbackUrl = (process.env.MPESA_CALLBACK_URL || "https://bosicapital.com/api/payments/callback").replace("/callback", "/stk-callback");

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: "Server M-Pesa Credentials missing" }, { status: 500 });
    }

    // 1. Get Token
    const auth = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString("base64");
    const tokenRes = await fetch(DARAJA_URLS[env].auth, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    const tokenData = await tokenRes.json().catch(() => null);
    if (!tokenData?.access_token) {
      return NextResponse.json({ error: "Failed to authenticate with Safaricom", detail: tokenData }, { status: 401 });
    }

    // 2. Generate Password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    // Format phone to 254...
    let formattedPhone = phone.replace("+", "").trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    }
    
    // 3. Send STK Push
    const stkRes = await fetch(DARAJA_URLS[env].stk, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // "CustomerBuyGoodsOnline" for till
        Amount: Math.ceil(Number(amount)),
        PartyA: formattedPhone,
        PartyB: shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: loanId.substring(0, 12),
        TransactionDesc: "Loan Repayment"
      }),
    });

    const stkData = await stkRes.json().catch(() => null);

    if (stkData?.ResponseCode === "0") {
      return NextResponse.json({ success: true, message: "STK push sent to your phone! Please enter your PIN.", data: stkData });
    } else {
      return NextResponse.json({ error: "Failed to send STK push", detail: stkData }, { status: 400 });
    }

  } catch (error: any) {
    console.error("STK Push error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
