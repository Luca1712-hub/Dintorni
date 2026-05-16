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
  /** Testo errore OneSignal (se invio rifiutato). */
  errore?: string;
  targeting?: "subscription_ids" | "external_id";
};

function formattaErroriOnesignal(errors: unknown): string {
  if (errors == null) return "OneSignal ha risposto senza ID notifica.";
  if (Array.isArray(errors)) return errors.map((e) => String(e)).join(" · ");
  if (typeof errors === "object") {
    try {
      return JSON.stringify(errors);
    } catch {
      return "Errore OneSignal (oggetto).";
    }
  }
  return String(errors);
}

async function inviaRichiestaOnesignal(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; id?: string; errore?: string }> {
  const apiKey = getOnesignalRestApiKey();

  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `key ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let json: { id?: string; errors?: unknown } | null = null;
  try {
    json = raw ? (JSON.parse(raw) as { id?: string; errors?: unknown }) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const dettaglio = json?.errors ? formattaErroriOnesignal(json.errors) : raw.slice(0, 400);
    return { ok: false, status: res.status, errore: `HTTP ${res.status}: ${dettaglio}` };
  }

  const id = json?.id?.trim();
  if (id) {
    return { ok: true, status: res.status, id };
  }

  return {
    ok: false,
    status: res.status,
    errore: json?.errors ? formattaErroriOnesignal(json.errors) : raw.slice(0, 400) || "Risposta senza ID.",
  };
}

/**
 * Invia push a tutte le subscription web attive dell'utente (PC + telefono).
 */
export async function sendOnesignalPushToUser(
  params: SendParams,
): Promise<SendOnesignalResult> {
  if (!isOnesignalPushConfigured()) {
    return { sent: false, targetedSubscriptions: 0, errore: "OneSignal non configurato." };
  }

  const appId = getOnesignalAppId();
  const subscriptionIds = await getWebPushSubscriptionIds(params.externalUserId);

  const basePayload: Record<string, unknown> = {
    app_id: appId,
    target_channel: "push",
    name: "Messaggio chat",
    headings: { it: params.title, en: params.title },
    contents: { it: params.body, en: params.body },
    url: params.url,
    web_url: params.url,
  };

  if (subscriptionIds.length > 0) {
    const prima = await inviaRichiestaOnesignal({
      ...basePayload,
      include_subscription_ids: subscriptionIds,
    });

    if (prima.ok && prima.id) {
      return {
        sent: true,
        targetedSubscriptions: subscriptionIds.length,
        notificationId: prima.id,
        targeting: "subscription_ids",
      };
    }

    const seconda = await inviaRichiestaOnesignal({
      ...basePayload,
      include_aliases: { external_id: [params.externalUserId] },
    });

    if (seconda.ok && seconda.id) {
      return {
        sent: true,
        targetedSubscriptions: subscriptionIds.length,
        notificationId: seconda.id,
        targeting: "external_id",
      };
    }

    return {
      sent: false,
      targetedSubscriptions: subscriptionIds.length,
      errore: seconda.errore ?? prima.errore ?? "Invio rifiutato.",
      targeting: "subscription_ids",
    };
  }

  const soloAlias = await inviaRichiestaOnesignal({
    ...basePayload,
    include_aliases: { external_id: [params.externalUserId] },
  });

  if (soloAlias.ok && soloAlias.id) {
    return {
      sent: true,
      targetedSubscriptions: 0,
      notificationId: soloAlias.id,
      targeting: "external_id",
    };
  }

  return {
    sent: false,
    targetedSubscriptions: 0,
    errore: soloAlias.errore ?? "Nessuna subscription web trovata per questo account.",
    targeting: "external_id",
  };
}
