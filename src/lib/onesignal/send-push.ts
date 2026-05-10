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
      Authorization: `Key ${apiKey}`,
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
  const id =
    typeof json === "object" && json !== null && "id" in json ? (json as { id?: string }).id : undefined;
  return Boolean(id);
}
