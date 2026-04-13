"use client";

import { useEffect, useState } from "react";
import type { RichiestaStato } from "@/lib/richiesta";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const POLL_MS = 12000;

type StatoPack = { richiestaId: string; stato: RichiestaStato | null };

/** Aggiorna lo stato della richiesta (aperta/chiusa) per bloccare la chat lato UI. */
export function useRichiestaStato(richiestaId: string | null) {
  const [pack, setPack] = useState<StatoPack | null>(null);

  useEffect(() => {
    if (!richiestaId || !isSupabaseConfigured()) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from("richieste")
        .select("stato")
        .eq("id", richiestaId)
        .maybeSingle();
      if (cancelled) return;
      const s = data?.stato;
      const nextStato = s === "aperta" || s === "chiusa" ? s : null;
      setPack({ richiestaId, stato: nextStato });
    };

    void run();
    const t = setInterval(() => {
      void run();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [richiestaId]);

  if (!richiestaId || !isSupabaseConfigured()) {
    return null;
  }
  if (!pack || pack.richiestaId !== richiestaId) {
    return null;
  }
  return pack.stato;
}
