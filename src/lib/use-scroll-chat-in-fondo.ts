"use client";

import { type RefObject, useEffect, useRef } from "react";
import { scrollListaMessaggiInFondo } from "@/lib/chat-scroll";

/**
 * Tieni la lista messaggi ancorata in basso (apertura chat, cambio negozio, nuovo messaggio).
 */
export function useScrollChatInFondo(
  listaRef: RefObject<HTMLDivElement | null>,
  conversazioneId: string | null,
  messaggi: { id: string }[],
) {
  const convPrecedente = useRef<string | null>(null);
  const ultimoId = messaggi.at(-1)?.id ?? null;

  useEffect(() => {
    if (!conversazioneId || messaggi.length === 0) return;

    const convCambiata = convPrecedente.current !== conversazioneId;
    convPrecedente.current = conversazioneId;

    scrollListaMessaggiInFondo(
      listaRef.current,
      convCambiata ? "auto" : "smooth",
    );
  }, [conversazioneId, messaggi.length, ultimoId, listaRef]);
}
