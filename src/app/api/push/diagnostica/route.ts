import { NextResponse } from "next/server";
import { isOnesignalPushConfigured } from "@/lib/onesignal/env";
import {
  fetchOnesignalUserByExternalId,
  isSubscriptionAndroid,
  webPushSubscriptionsAttive,
} from "@/lib/onesignal/server-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stato push lato server (OneSignal + eventuale VAPID legacy in DB). */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase non configurato." }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const onesignalOk = isOnesignalPushConfigured();

  const { data: vapidRows } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, created_at")
    .eq("user_id", user.id);

  let onesignal: {
    externalId: string | null;
    webPushAttive: number;
    androidWebPushAttive: number;
    subscriptions: Array<{
      id?: string;
      type?: string;
      device_os?: string;
      enabled?: boolean;
    }>;
  } | null = null;

  if (onesignalOk) {
    const view = await fetchOnesignalUserByExternalId(user.id);
    if (view) {
      const web = webPushSubscriptionsAttive(view.subscriptions);
      onesignal = {
        externalId: view.identity?.external_id ?? null,
        webPushAttive: web.length,
        androidWebPushAttive: web.filter(isSubscriptionAndroid).length,
        subscriptions: web.map((s) => ({
          id: s.id,
          type: s.type,
          device_os: s.device_os,
          enabled: s.enabled,
        })),
      };
    }
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    onesignalConfigurato: onesignalOk,
    subscriptionVapidInDb: (vapidRows ?? []).length,
    vapidEndpoints: (vapidRows ?? []).map((r) => ({
      id: r.id,
      endpoint: typeof r.endpoint === "string" ? r.endpoint.slice(0, 48) + "…" : "",
      created_at: r.created_at,
    })),
    onesignal,
    nota:
      "Le push chat passano da OneSignal se onesignalConfigurato è true. Il pannello Messages spesso non elenca gli invii API: usa «Prova push» qui sotto o i log webhook Supabase.",
  });
}
