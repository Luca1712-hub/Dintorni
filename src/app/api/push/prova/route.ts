import { NextResponse } from "next/server";
import { isOnesignalPushConfigured } from "@/lib/onesignal/env";
import { sendOnesignalPushToUser } from "@/lib/onesignal/send-push";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Invia una push di prova (stesso canale della chat) e restituisce l'ID OneSignal. */
export async function POST() {
  if (!isOnesignalPushConfigured()) {
    return NextResponse.json(
      { ok: false, error: "OneSignal non configurato su Vercel (APP_ID + REST API KEY)." },
      { status: 503 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dintorni.vercel.app").replace(
    /\/$/,
    "",
  );

  const result = await sendOnesignalPushToUser({
    externalUserId: user.id,
    title: "Prova push — Dintorni",
    body: "Se vedi questo avviso, OneSignal funziona su questo dispositivo.",
    url: `${baseUrl}/area-personale`,
  });

  return NextResponse.json({
    ok: result.sent,
    canale: "onesignal",
    inviata: result.sent,
    dispositiviTarget: result.targetedSubscriptions,
    onesignalNotificationId: result.notificationId ?? null,
    errore: result.errore ?? null,
    messaggio: result.sent
      ? "Push inviata. Controlla se compare il popup del browser (anche con finestra in secondo piano)."
      : null,
  });
}
