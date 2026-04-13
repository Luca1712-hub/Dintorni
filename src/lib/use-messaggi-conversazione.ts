"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessaggioRow } from "@/lib/chat-types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const POLL_SYNC_MS = 12_000;

function sortByCreatedAt(a: MessaggioRow, b: MessaggioRow): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

async function fetchMessaggi(cid: string): Promise<MessaggioRow[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("messaggi")
    .select("*")
    .eq("conversazione_id", cid)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as MessaggioRow[];
}

/**
 * Carica i messaggi di una conversazione e si aggiorna in tempo reale (Realtime).
 * C'è anche un polling leggero come rete di sicurezza se un evento sfugge.
 */
export function useMessaggiConversazione(conversazioneId: string | null) {
  const [messaggi, setMessaggi] = useState<MessaggioRow[]>([]);
  /** Evita di mostrare messaggi della conversazione sbagliata durante il caricamento. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const conversazioneRef = useRef<string | null>(conversazioneId);

  useEffect(() => {
    conversazioneRef.current = conversazioneId;
  }, [conversazioneId]);

  const messaggiVisibili =
    conversazioneId && loadedFor === conversazioneId ? messaggi : [];

  useEffect(() => {
    if (!conversazioneId) {
      return;
    }

    const cid = conversazioneId;
    let cancelled = false;

    void (async () => {
      const rows = await fetchMessaggi(cid);
      if (cancelled || conversazioneRef.current !== cid) return;
      setMessaggi(rows);
      setLoadedFor(cid);
    })();

    const supabase = createBrowserSupabaseClient();
    const channelName = `messaggi:${conversazioneId}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaggi",
          filter: `conversazione_id=eq.${conversazioneId}`,
        },
        (payload) => {
          const row = payload.new as MessaggioRow;
          if (!row?.id) return;
          setMessaggi((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row].sort(sortByCreatedAt);
          });
        },
      )
      .subscribe();

    const poll = setInterval(() => {
      if (cancelled || conversazioneRef.current !== cid) return;
      void (async () => {
        const rows = await fetchMessaggi(cid);
        if (cancelled || conversazioneRef.current !== cid) return;
        setMessaggi(rows);
        setLoadedFor(cid);
      })();
    }, POLL_SYNC_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [conversazioneId]);

  const ricarica = useCallback(async () => {
    const cid = conversazioneRef.current;
    if (!cid) return;
    const rows = await fetchMessaggi(cid);
    if (conversazioneRef.current !== cid) return;
    setMessaggi(rows);
    setLoadedFor(cid);
  }, []);

  return { messaggi: messaggiVisibili, ricarica };
}
