import { NextResponse } from "next/server";
import { isOnesignalPushConfigured } from "@/lib/onesignal/env";
import {
  fetchOnesignalUserByExternalId,
  isSubscriptionAndroid,
  webPushSubscriptionsAttive,
} from "@/lib/onesignal/server-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOnesignalPushConfigured()) {
    return NextResponse.json({ ok: false, error: "OneSignal non configurato." }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const url = new URL(request.url);
  const localId = url.searchParams.get("localId")?.trim() ?? "";

  const view = await fetchOnesignalUserByExternalId(user.id);
  if (!view) {
    return NextResponse.json(
      { ok: false, error: "Impossibile leggere lo stato da OneSignal." },
      { status: 502 },
    );
  }

  const webAttive = webPushSubscriptionsAttive(view.subscriptions);
  const androidAttive = webAttive.filter(isSubscriptionAndroid);
  const localRegistered = localId
    ? webAttive.some((s) => s.id === localId)
    : webAttive.length > 0;

  return NextResponse.json({
    ok: true,
    externalId: view.identity?.external_id ?? null,
    webPushAttive: webAttive.length,
    androidWebPushAttive: androidAttive.length,
    localRegistered,
    subscriptions: webAttive.map((s) => ({
      id: s.id,
      type: s.type,
      device_os: s.device_os,
      device_model: s.device_model,
    })),
  });
}
