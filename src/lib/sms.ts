/**
 * Africa's Talking SMS Utility
 */
export async function sendSMS(to: string, message: string) {
  const username = process.env.AFRICAS_TALKING_USERNAME || "sandbox";
  const apiKey = process.env.AFRICAS_TALKING_APIKEY;

  if (!apiKey || apiKey === "your_api_key") {
    console.warn("[SMS] Africa's Talking API key is not configured.");
    return { success: false, error: "API key not configured" };
  }

  // Use sandbox API if username is 'sandbox'
  const baseURL = username.toLowerCase() === "sandbox" 
    ? "https://api.sandbox.africastalking.com" 
    : "https://api.africastalking.com";
  
  const url = `${baseURL}/version1/messaging`;

  // Standardize phone number for Africa's Talking (must be +254XXXXXXXXX)
  let formattedPhone = to.replace(/\s+/g, "").replace(/^\+/, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "254" + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith("7") && formattedPhone.length === 9) {
    formattedPhone = "254" + formattedPhone;
  }
  
  if (!formattedPhone.startsWith("254")) {
     // If it doesn't start with 254, assume it's already in international format or prepend if missing
     // But for now, let's assume it should be +254
     if (formattedPhone.length === 9) formattedPhone = "254" + formattedPhone;
  }
  
  const recipients = "+" + formattedPhone;

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
      return { success: true, result };
    } else {
      return { success: false, error: result };
    }
  } catch (error: any) {
    console.error("[SMS] Error sending message:", error.message);
    return { success: false, error: error.message };
  }
}
