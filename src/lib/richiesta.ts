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
  categorie: unknown;
  created_at: string;
  stato: RichiestaStato;
  chiusa_at: string | null;
};

export function parseCategorieRichiesta(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

export function formatoZonaRichiesta(r: Pick<RichiestaRow, "zona_tipo" | "raggio_km" | "comune">): string {
  if (r.zona_tipo === "comune" && r.comune) {
    return `Comune: ${r.comune}`;
  }
  if (r.zona_tipo === "gps" && r.raggio_km != null) {
    return `Intorno alla mia posizione · ${r.raggio_km} km`;
  }
  if (r.zona_tipo === "gps") {
    return "Intorno alla mia posizione";
  }
  return "—";
}
