import type { AllegatoMessaggio } from "@/lib/chat-types";

type Risultato = { ok: true } | { ok: false; error: string };

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // ignore
  }
  return `Errore server (${res.status}).`;
}

/** Invia messaggio in chat tramite API server (evita blocchi del client Supabase nel browser). */
export async function inviaMessaggioChat(params: {
  conversazioneId: string;
  testo: string;
  files: File[];
}): Promise<Risultato> {
  const allegati: AllegatoMessaggio[] = [];

  for (const f of params.files) {
    const fd = new FormData();
    fd.append("conversazione_id", params.conversazioneId);
    fd.append("file", f);

    const upRes = await fetch("/api/chat/allegato", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });

    if (!upRes.ok) {
      return { ok: false, error: await parseApiError(upRes) };
    }

    const upJson = (await upRes.json()) as { allegato?: AllegatoMessaggio };
    if (!upJson.allegato?.url || !upJson.allegato?.path) {
      return { ok: false, error: "Risposta caricamento allegato non valida." };
    }
    allegati.push(upJson.allegato);
  }

  const msgRes = await fetch("/api/chat/messaggio", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversazione_id: params.conversazioneId,
      testo: params.testo.trim(),
      allegati,
    }),
  });

  if (!msgRes.ok) {
    return { ok: false, error: await parseApiError(msgRes) };
  }

  return { ok: true };
}
