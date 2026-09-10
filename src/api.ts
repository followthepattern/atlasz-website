// Leads go to STRV.AI, which owns the CRM they are worked in: a lead lands in
// app.lead there and is promoted into a CRM contact from the connector. Override
// via VITE_API_BASE_URL (set it empty for local dev so requests hit the Vite proxy).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://app.strv.ai";

export interface SubscribePayload {
  email: string;
  name: string;
  phone: string;
  gdprConsent: boolean;
  marketingConsent?: boolean;
  flowVersion: string;
  source?: string;
  answers?: Record<string, unknown>;
}

export async function subscribe(payload: SubscribePayload): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
}
