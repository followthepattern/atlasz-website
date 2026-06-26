// Backend base URL. Defaults to the production atlasz backend; override via
// VITE_API_BASE_URL (e.g. set it empty for local dev so requests hit the Vite
// proxy / same origin).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://app.atlasz.eu";

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
  const res = await fetch(`${API_BASE_URL}/api/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
