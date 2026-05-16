import { NextResponse } from "next/server";
import { verificaInvioMessaggioInConversazione } from "@/lib/chat-invio-api";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "messaggi-allegati";
const MAX_MB = 5;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase non configurato." }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form non valido." }, { status: 400 });
  }

  const conversazioneId = String(form.get("conversazione_id") ?? "").trim();
  const file = form.get("file");

  if (!conversazioneId) {
    return NextResponse.json({ error: "conversazione_id mancante." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo immagini consentite." }, { status: 400 });
  }

  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `Immagine troppo grande (max ${MAX_MB} MB).` },
      { status: 400 },
    );
  }

  const check = await verificaInvioMessaggioInConversazione(
    supabase,
    conversazioneId,
    user.id,
  );
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (upErr) {
    return NextResponse.json(
      { error: `Caricamento immagine fallito: ${upErr.message}` },
      { status: 400 },
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    allegato: { url: pub.publicUrl, path, name: file.name },
  });
}
