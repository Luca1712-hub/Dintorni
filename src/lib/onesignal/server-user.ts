import { getOnesignalAppId, getOnesignalRestApiKey } from "@/lib/onesignal/env";

export type OnesignalSubscriptionRow = {
  id?: string;
  type?: string;
  enabled?: boolean;
  device_os?: string;
  device_model?: string;
  token?: string;
  web_auth?: string;
  web_p256?: string;
};

export type OnesignalUserView = {
  identity?: { external_id?: string; onesignal_id?: string };
  subscriptions: OnesignalSubscriptionRow[];
};

function isWebPushType(type: string | undefined): boolean {
  const t = (type ?? "").toLowerCase();
  if (!t || t.includes("email") || t.includes("sms")) return false;
  return (
    t.includes("web") ||
    t.includes("chrome") ||
    t.includes("firefox") ||
    t.includes("safari") ||
    t.includes("edge") ||
    t === "pushtoken"
  );
}

export function isSubscriptionAndroid(sub: OnesignalSubscriptionRow): boolean {
  const os = (sub.device_os ?? "").toLowerCase();
  return os.includes("android");
}

/** Subscription web push attive (Chrome desktop, Chrome Android, ecc.). */
export function webPushSubscriptionsAttive(
  subs: OnesignalSubscriptionRow[] | undefined,
): OnesignalSubscriptionRow[] {
  return (subs ?? []).filter((s) => {
    if (!s.id || s.enabled === false) return false;
    const t = (s.type ?? "").toLowerCase();
    if (t.includes("email") || t.includes("sms")) return false;
    if (isWebPushType(s.type)) return true;
    return Boolean(s.web_auth || s.web_p256);
  });
}

/** Carica utente OneSignal tramite external_id (UUID Supabase). */
export async function fetchOnesignalUserByExternalId(
  externalUserId: string,
): Promise<OnesignalUserView | null> {
  const appId = getOnesignalAppId();
  const apiKey = getOnesignalRestApiKey();

  const res = await fetch(
    `https://api.onesignal.com/apps/${encodeURIComponent(appId)}/users/by/external_id/${encodeURIComponent(externalUserId)}`,
    {
      headers: { Authorization: `key ${apiKey}` },
      cache: "no-store",
    },
  );

  if (res.status === 404) {
    return { subscriptions: [] };
  }

  if (!res.ok) {
    const t = await res.text();
    console.error("[OneSignal] view user", res.status, t);
    return null;
  }

  const json = (await res.json()) as OnesignalUserView;
  return {
    identity: json.identity,
    subscriptions: json.subscriptions ?? [],
  };
}

export async function getWebPushSubscriptionIds(externalUserId: string): Promise<string[]> {
  const user = await fetchOnesignalUserByExternalId(externalUserId);
  if (!user) return [];
  return webPushSubscriptionsAttive(user.subscriptions)
    .map((s) => s.id as string)
    .filter(Boolean);
}
