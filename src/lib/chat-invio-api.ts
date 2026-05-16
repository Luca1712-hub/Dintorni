import type { SupabaseClient } from "@supabase/supabase-js";
import type { AllegatoMessaggio } from "@/lib/chat-types";

export async function verificaInvioMessaggioInConversazione(
  supabase: SupabaseClient,
  conversazioneId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: conv, error: convErr } = await supabase
    .from("conversazioni")
    .select("id, acquirente_id, negozio_id, richiesta_id")
    .eq("id", conversazioneId)
    .maybeSingle();

  if (convErr || !conv) {
    return { ok: false, status: 404, error: "Conversazione non trovata." };
  }

  if (conv.acquirente_id !== userId && conv.negozio_id !== userId) {
    return { ok: false, status: 403, error: "Non sei un partecipante di questa chat." };
  }

  const { data: richiesta, error: rErr } = await supabase
    .from("richieste")
    .select("stato")
    .eq("id", conv.richiesta_id)
    .maybeSingle();

  if (rErr || !richiesta) {
    return { ok: false, status: 404, error: "Richiesta collegata non trovata." };
  }

  if (richiesta.stato === "chiusa") {
    return {
      ok: false,
      status: 400,
      error: "La richiesta e` chiusa: non puoi inviare altri messaggi.",
    };
  }

  return { ok: true };
}

export function normalizzaAllegatiJson(raw: unknown): AllegatoMessaggio[] {
  if (!Array.isArray(raw)) return [];
  const out: AllegatoMessaggio[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.url !== "string" || typeof o.path !== "string") continue;
    out.push({
      url: o.url,
      path: o.path,
      name: typeof o.name === "string" ? o.name : undefined,
    });
  }
  return out;
}
