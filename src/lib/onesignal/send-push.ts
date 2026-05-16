import {
  getOnesignalAppId,
  getOnesignalRestApiKey,
  isOnesignalPushConfigured,
} from "@/lib/onesignal/env";

type SendParams = {
  externalUserId: string;
  title: string;
  body: string;
  url: string;
};

/**
 * Invia una notifica push web tramite OneSignal (external_id = UUID Supabase Auth).
 * @returns true se la richiesta è stata accettata con `id` nella risposta
 */
export async function sendOnesignalPushToUser(params: SendParams): Promise<boolean> {
  if (!isOnesignalPushConfigured()) return false;

  const appId = getOnesignalAppId();
  const apiKey = getOnesignalRestApiKey();

  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `key ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: {
        external_id: [params.externalUserId],
      },
      name: "Messaggio chat",
      headings: { it: params.title, en: params.title },
      contents: { it: params.body, en: params.body },
      url: params.url,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[OneSignal] notifications API", res.status, t);
    return false;
  }

  const json: unknown = await res.json().catch(() => null);
  if (typeof json === "object" && json !== null) {
    const body = json as { id?: string; errors?: unknown };
    if (body.errors) {
      console.error("[OneSignal] notifications API errors", body.errors);
    }
    if (body.id) return true;
  }
  return false;
}
