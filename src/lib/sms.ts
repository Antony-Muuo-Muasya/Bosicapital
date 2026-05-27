/**
 * Africa's Talking SMS Utility
 */
export async function sendSMS(to: string, message: string) {
  const username = (process.env.AFRICAS_TALKING_USERNAME || "sandbox").trim();
  const apiKey = (process.env.AFRICAS_TALKING_APIKEY || "").trim();

  if (!apiKey || apiKey === "your_api_key") {
    console.warn("[SMS] Africa's Talking API key is not configured.");
    return { success: false, error: "API key not configured" };
  }

  // Use sandbox API if username is 'sandbox'
  const baseURL = username.toLowerCase() === "sandbox" 
    ? "https://api.sandbox.africastalking.com" 
    : "https://api.africastalking.com";
  
  const url = `${baseURL}/version1/messaging`;

  // Standardize phone number for Africa's Talking (MUST be +254XXXXXXXXX)
  let cleaned = to.toString().replace(/[^0-9]/g, ""); // Remove everything except digits
  
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  } else if (cleaned.startsWith("7") && cleaned.length === 9) {
    cleaned = "254" + cleaned;
  }
  
  // Ensure it starts with 254 and has 12 digits total
  if (cleaned.length === 9) cleaned = "254" + cleaned;
  
  // Africa's Talking requires the PLUS sign
  const recipients = "+" + cleaned;
  console.log(`[SMS] Sending to: ${recipients}`);

  try {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("to", recipients);
    params.append("message", message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": apiKey,
      },
      body: params.toString(),
    });

    const result = await response.json();
    console.log("[SMS] Africa's Talking response:", JSON.stringify(result));

    if (response.ok) {
      // Check individual recipient status
      const recipientData = result.SMSMessageData?.Recipients?.[0];
      const status = recipientData?.status;
      
      if (status === 'Success' || status === 'Sent') {
        return { success: true, result };
      } else {
        return { 
          success: false, 
          error: `Provider Status: ${status || 'Unknown'}. Detail: ${recipientData?.errorMessage || 'Check your balance.'}` 
        };
      }
    } else {
      return { success: false, error: result };
    }
  } catch (error: any) {
    console.error("[SMS] Error sending message:", error.message);
    return { success: false, error: error.message };
  }
}
