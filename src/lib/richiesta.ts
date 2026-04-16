export type RichiestaStato = "aperta" | "chiusa";

export type RichiestaRow = {
  id: string;
  acquirente_id: string;
  testo: string;
  zona_tipo: "gps" | "comune";
  raggio_km: number | null;
  lat: number | null;
  lng: number | null;
  comune: string | null;
  /** Sigla provincia (es. MI) per zona comune estesa; null su richieste legacy. */
  provincia_sigla?: string | null;
  /** Elenco etichette comuni; null se tutta provincia o legacy. */
  comuni?: unknown;
  comuni_tutta_provincia?: boolean | null;
  categorie: unknown;
  /** Foto allegate alla richiesta (stesso formato degli allegati in chat). */
  allegati?: unknown;
  created_at: string;
  stato: RichiestaStato;
  chiusa_at: string | null;
};

export function parseCategorieRichiesta(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

export function parseComuniRichiesta(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function formatoZonaRichiesta(
  r: Pick<
    RichiestaRow,
    | "zona_tipo"
    | "raggio_km"
    | "comune"
    | "provincia_sigla"
    | "comuni"
    | "comuni_tutta_provincia"
  >,
): string {
  if (r.zona_tipo === "comune") {
    if (r.comuni_tutta_provincia && r.provincia_sigla?.trim()) {
      return `Tutta la provincia (${r.provincia_sigla.trim()})`;
    }
    const lista = parseComuniRichiesta(r.comuni);
    if (lista.length === 1) {
      return `Comuni: ${lista[0]}`;
    }
    if (lista.length > 1) {
      const primi = lista.slice(0, 2).join(", ");
      return `Comuni: ${lista.length} selezionati (${primi}${lista.length > 2 ? "…" : ""})`;
    }
    if (r.comune?.trim()) {
      return `Comune: ${r.comune.trim()}`;
    }
  }
  if (r.zona_tipo === "gps" && r.raggio_km != null) {
    return `Intorno alla mia posizione · ${r.raggio_km} km`;
  }
  if (r.zona_tipo === "gps") {
    return "Intorno alla mia posizione";
  }
  return "—";
}
