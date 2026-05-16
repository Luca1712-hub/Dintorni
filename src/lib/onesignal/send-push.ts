import {
  getOnesignalAppId,
  getOnesignalRestApiKey,
  isOnesignalPushConfigured,
} from "@/lib/onesignal/env";
import { getWebPushSubscriptionIds } from "@/lib/onesignal/server-user";

type SendParams = {
  externalUserId: string;
  title: string;
  body: string;
  url: string;
};

export type SendOnesignalResult = {
  sent: boolean;
  targetedSubscriptions: number;
  notificationId?: string;
};

/**
 * Invia push a tutte le subscription web attive dell'utente (PC + telefono).
 * Usa gli ID subscription da OneSignal, non solo external_id (più affidabile su Android).
 */
export async function sendOnesignalPushToUser(
  params: SendParams,
): Promise<SendOnesignalResult> {
  if (!isOnesignalPushConfigured()) {
    return { sent: false, targetedSubscriptions: 0 };
  }

  const appId = getOnesignalAppId();
  const apiKey = getOnesignalRestApiKey();

  const subscriptionIds = await getWebPushSubscriptionIds(params.externalUserId);

  const body: Record<string, unknown> = {
    app_id: appId,
    target_channel: "push",
    name: "Messaggio chat",
    headings: { it: params.title, en: params.title },
    contents: { it: params.body, en: params.body },
    url: params.url,
    web_url: params.url,
  };

  if (subscriptionIds.length > 0) {
    body.include_subscription_ids = subscriptionIds;
  } else {
    body.include_aliases = {
      external_id: [params.externalUserId],
    };
  }

  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `key ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[OneSignal] notifications API", res.status, t);
    return { sent: false, targetedSubscriptions: subscriptionIds.length };
  }

  const json: unknown = await res.json().catch(() => null);
  if (typeof json === "object" && json !== null) {
    const parsed = json as { id?: string; errors?: unknown };
    if (parsed.errors) {
      console.error("[OneSignal] notifications API errors", parsed.errors);
    }
    if (parsed.id) {
      return {
        sent: true,
        targetedSubscriptions: subscriptionIds.length,
        notificationId: parsed.id,
      };
    }
  }

  return { sent: false, targetedSubscriptions: subscriptionIds.length };
}
