import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAllegati, type AllegatoMessaggio } from "@/lib/chat-types";
import type { RichiestaStato } from "@/lib/richiesta";

export type NegozioChatInitOk = {
  ok: true;
  conversazioneId: string;
  myId: string;
  richiestaTesto: string | null;
  richiestaAllegati: AllegatoMessaggio[];
  statoRichiestaInit: RichiestaStato | null;
};

export type NegozioChatInitFail = {
  ok: false;
  error: string;
};

export type NegozioChatInit = NegozioChatInitOk | NegozioChatInitFail;

export async function initNegozioChat(
  supabase: SupabaseClient,
  richiestaId: string,
  negozioUserId: string,
): Promise<NegozioChatInit> {
  const { data: richiesta, error: er } = await supabase
    .from("richieste")
    .select("testo, stato, allegati")
    .eq("id", richiestaId)
    .maybeSingle();

  if (er || !richiesta) {
    return {
      ok: false,
      error: "Richiesta non trovata o non visibile con il tuo account.",
    };
  }

  const richiestaTesto = typeof richiesta.testo === "string" ? richiesta.testo : null;
  const richiestaAllegati = parseAllegati(richiesta.allegati);
  const st = richiesta.stato;
  const statoRichiestaInit: RichiestaStato | null =
    st === "aperta" || st === "chiusa" ? st : null;

  const { data: esistente } = await supabase
    .from("conversazioni")
    .select("id")
    .eq("richiesta_id", richiestaId)
    .eq("negozio_id", negozioUserId)
    .maybeSingle();

  let cid = esistente?.id as string | undefined;

  if (!cid) {
    const { data: r } = await supabase
      .from("richieste")
      .select("acquirente_id")
      .eq("id", richiestaId)
      .single();

    if (!r?.acquirente_id) {
      return { ok: false, error: "Impossibile avviare la chat per questa richiesta." };
    }

    const { data: creata, error: insErr } = await supabase
      .from("conversazioni")
      .insert({
        richiesta_id: richiestaId,
        acquirente_id: r.acquirente_id,
        negozio_id: negozioUserId,
      })
      .select("id")
      .single();

    if (insErr) {
      const { data: diNuovo } = await supabase
        .from("conversazioni")
        .select("id")
        .eq("richiesta_id", richiestaId)
        .eq("negozio_id", negozioUserId)
        .maybeSingle();
      cid = diNuovo?.id as string | undefined;
      if (!cid) {
        return {
          ok: false,
          error: insErr.message.includes("conversazioni_bi_validate")
            ? "Non puoi aprire la chat: richiesta chiusa o categorie non compatibili."
            : insErr.message,
        };
      }
    } else {
      cid = creata?.id as string;
    }
  }

  if (!cid) {
    return { ok: false, error: "Impossibile avviare la conversazione." };
  }

  return {
    ok: true,
    conversazioneId: cid,
    myId: negozioUserId,
    richiestaTesto,
    richiestaAllegati,
    statoRichiestaInit,
  };
}
