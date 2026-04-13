import type { SupabaseClient } from "@supabase/supabase-js";

type RpcUnreadRichiesta = { richiesta_id: string; unread_count: number | string };
type RpcUnreadConv = { conversazione_id: string; unread_count: number | string };

function toCount(v: number | string | undefined): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Number(n) : 0;
}

/** Mappa richiesta_id → messaggi non letti in chat (per elenchi dashboard). */
export async function fetchUnreadByRichiesta(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("unread_chat_per_richiesta");
  if (error || !data) return new Map();
  const m = new Map<string, number>();
  for (const row of data as RpcUnreadRichiesta[]) {
    if (row.richiesta_id) m.set(row.richiesta_id, toCount(row.unread_count));
  }
  return m;
}

/** Mappa conversazione_id → non letti (tab acquirente su piu` negozi). */
export async function fetchUnreadByConversazione(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("unread_chat_per_conversazione");
  if (error || !data) return new Map();
  const m = new Map<string, number>();
  for (const row of data as RpcUnreadConv[]) {
    if (row.conversazione_id) m.set(row.conversazione_id, toCount(row.unread_count));
  }
  return m;
}

export async function marcaConversazioneLetta(
  supabase: SupabaseClient,
  conversazioneId: string,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.rpc("marca_conversazione_letta", {
    p_conversazione_id: conversazioneId,
  });
  if (error) return { ok: false };
  return { ok: true };
}

/** Messaggio dell'altro partecipante arrivato dopo la «soglia» (tipicamente dopo marca lettura in chat). */
export function messaggioNuovoDopoSogliaUtente(
  m: { mittente_id: string; created_at: string },
  myUserId: string | null,
  sogliaIso: string | null,
): boolean {
  if (!myUserId || !sogliaIso || m.mittente_id === myUserId) return false;
  return new Date(m.created_at).getTime() > new Date(sogliaIso).getTime();
}
