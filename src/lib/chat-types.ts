export type AllegatoMessaggio = {
  url: string;
  path: string;
  name?: string;
};

export type MessaggioRow = {
  id: string;
  conversazione_id: string;
  mittente_id: string;
  testo: string;
  allegati: unknown;
  created_at: string;
};

export type ConversazioneRow = {
  id: string;
  richiesta_id: string;
  acquirente_id: string;
  negozio_id: string;
  created_at: string;
  /** Ultima volta che l'acquirente ha «visto» la chat (null = mai). */
  acquirente_ultima_lettura_at?: string | null;
  /** Ultima volta che il negozio ha «visto» la chat (null = mai). */
  negozio_ultima_lettura_at?: string | null;
};

export function parseAllegati(raw: unknown): AllegatoMessaggio[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is AllegatoMessaggio =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as AllegatoMessaggio).url === "string" &&
      typeof (x as AllegatoMessaggio).path === "string",
  );
}
