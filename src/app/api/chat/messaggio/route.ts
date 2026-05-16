import { NextResponse } from "next/server";
import {
  normalizzaAllegatiJson,
  verificaInvioMessaggioInConversazione,
} from "@/lib/chat-invio-api";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  conversazione_id?: string;
  testo?: string;
  allegati?: unknown;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase non configurato." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }

  const conversazioneId =
    typeof body.conversazione_id === "string" ? body.conversazione_id.trim() : "";
  const testo = typeof body.testo === "string" ? body.testo.trim() : "";
  const allegati = normalizzaAllegatiJson(body.allegati);

  if (!conversazioneId) {
    return NextResponse.json({ error: "conversazione_id mancante." }, { status: 400 });
  }

  if (testo.length === 0 && allegati.length === 0) {
    return NextResponse.json(
      { error: "Scrivi un messaggio oppure allega almeno un'immagine." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const check = await verificaInvioMessaggioInConversazione(
    supabase,
    conversazioneId,
    user.id,
  );
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { data: inserted, error: msgErr } = await supabase
    .from("messaggi")
    .insert({
      conversazione_id: conversazioneId,
      mittente_id: user.id,
      testo,
      allegati,
    })
    .select("id")
    .single();

  if (msgErr) {
    const message = msgErr.message.includes("messaggi_ha_contenuto")
      ? "Serve testo oppure almeno un'immagine."
      : msgErr.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: inserted?.id ?? null });
}
