import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessaggioRecord = {
  id?: string;
  conversazione_id?: string;
  mittente_id?: string;
  testo?: string;
};

type WebhookBody = {
  type?: string;
  table?: string;
  record?: MessaggioRecord;
};

function estraiRecord(body: unknown): MessaggioRecord | null {
  if (!body || typeof body !== "object") return null;
  const b = body as WebhookBody;
  if (b.record && typeof b.record === "object") return b.record;
  const direct = body as MessaggioRecord;
  if (direct.conversazione_id) return direct;
  return null;
}

function verificaAuth(request: Request): boolean {
  const secret = process.env.MESSAGGIO_WEBHOOK_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  const h = request.headers.get("x-webhook-secret");
  return h === secret;
}

export async function POST(request: Request) {
  if (!verificaAuth(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const record = estraiRecord(body);
  if (!record?.conversazione_id || !record.mittente_id) {
    return NextResponse.json({ ok: false, error: "Missing conversazione_id or mittente_id" }, { status: 400 });
  }

  const conversazioneId = record.conversazione_id;
  const mittenteId = record.mittente_id;
  const anteprima =
    typeof record.testo === "string" && record.testo.trim()
      ? record.testo.trim().slice(0, 140)
      : "Hai ricevuto un nuovo messaggio in chat.";

  let supabase;
  try {
    supabase = createServiceSupabaseClient();
  } catch (e) {
    console.error("[notify-message]", e);
    return NextResponse.json(
      { ok: false, error: "Server Supabase non configurato (service role)" },
      { status: 500 },
    );
  }

  const { data: conv, error: convErr } = await supabase
    .from("conversazioni")
    .select("id, richiesta_id, acquirente_id, negozio_id")
    .eq("id", conversazioneId)
    .maybeSingle();

  if (convErr || !conv) {
    console.error("[notify-message] conversazione", convErr);
    return NextResponse.json({ ok: false, error: "Conversazione non trovata" }, { status: 404 });
  }

  const destinatarioId =
    mittenteId === conv.acquirente_id ? conv.negozio_id : conv.acquirente_id;

  if (!destinatarioId || destinatarioId === mittenteId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const chatPath =
    destinatarioId === conv.acquirente_id
      ? `/dashboard/le-mie-richieste/${conv.richiesta_id}/chat`
      : `/dashboard/richieste-in-arrivo/${conv.richiesta_id}/chat`;
  const chatUrl = `${baseUrl}${chatPath}`;

  const { data: profilo, error: profErr } = await supabase
    .from("profiles")
    .select("email, notifiche_email, notifiche_push")
    .eq("id", destinatarioId)
    .maybeSingle();

  if (profErr || !profilo?.email) {
    console.error("[notify-message] profilo", profErr);
    return NextResponse.json({ ok: false, error: "Profilo destinatario non trovato" }, { status: 404 });
  }

  const emailOn = profilo.notifiche_email !== false;
  const pushOn = profilo.notifiche_push !== false;

  let emailInviata = false;
  let pushInviati = 0;

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Dintorni <onboarding@resend.dev>";

  if (emailOn && resendKey) {
    const html = `
      <p>${anteprima.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      <p><a href="${chatUrl}">Apri la chat su Dintorni</a></p>
    `;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [profilo.email as string],
        subject: "Nuovo messaggio su Dintorni",
        html,
      }),
    });
    emailInviata = res.ok;
    if (!res.ok) {
      const t = await res.text();
      console.error("[notify-message] Resend", res.status, t);
    }
  }

  const publicVapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateVapid = process.env.VAPID_PRIVATE_KEY;
  const vapidMailto = process.env.VAPID_MAILTO || "mailto:notify@dintorni.app";

  if (pushOn && publicVapid && privateVapid) {
    webpush.setVapidDetails(vapidMailto, publicVapid, privateVapid);

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", destinatarioId);

    const payload = JSON.stringify({
      title: "Nuovo messaggio — Dintorni",
      body: anteprima,
      url: chatUrl,
    });

    for (const s of subs ?? []) {
      if (!s.endpoint || !s.p256dh || !s.auth) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
        );
        pushInviati += 1;
      } catch (err) {
        console.error("[notify-message] webpush", err);
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    email: emailInviata,
    push: pushInviati,
    skippedEmail: !emailOn || !resendKey,
    skippedPush: !pushOn || !publicVapid || !privateVapid,
  });
}
