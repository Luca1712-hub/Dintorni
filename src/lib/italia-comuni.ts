/**
 * Elenco comuni italiani (ISTAT) — caricato da `/public/data/comuni-italia.json`
 * (fonte: https://github.com/matteocontrini/comuni-json , licenza MIT).
 */
export type ComuneItaliaJson = {
  nome: string;
  codice: string;
  provincia: { codice: string; nome: string };
  sigla: string;
};

export type ProvinciaOpzione = {
  sigla: string;
  nomeProvincia: string;
  /** Per il menu: "Padova (PD)" */
  label: string;
};

export type ComuneOpzione = {
  codice: string;
  nome: string;
  /** Valore salvato in DB / form: "Abano Terme (PD)" */
  label: string;
};

let cache: ComuneItaliaJson[] | null = null;
let inflight: Promise<ComuneItaliaJson[]> | null = null;

export function labelComune(c: Pick<ComuneItaliaJson, "nome" | "sigla">): string {
  return `${c.nome} (${c.sigla})`;
}

export async function loadComuniItalia(): Promise<ComuneItaliaJson[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch("/data/comuni-italia.json");
    if (!res.ok) {
      throw new Error(`Elenco comuni non disponibile (${res.status})`);
    }
    const data = (await res.json()) as ComuneItaliaJson[];
    cache = data;
    inflight = null;
    return data;
  })();
  return inflight;
}

export function elencoProvince(rows: ComuneItaliaJson[]): ProvinciaOpzione[] {
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!map.has(r.sigla)) map.set(r.sigla, r.provincia.nome);
  }
  return [...map.entries()]
    .map(([sigla, nomeProvincia]) => ({
      sigla,
      nomeProvincia,
      label: `${nomeProvincia} (${sigla})`,
    }))
    .sort((a, b) => a.nomeProvincia.localeCompare(b.nomeProvincia, "it"));
}

export function comuniDellaProvincia(rows: ComuneItaliaJson[], sigla: string): ComuneOpzione[] {
  return rows
    .filter((r) => r.sigla === sigla)
    .map((r) => ({
      codice: r.codice,
      nome: r.nome,
      label: labelComune(r),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

/** Trova comune dall'etichetta salvata (es. "Milano (MI)"). */
export function trovaComuneDaLabel(
  rows: ComuneItaliaJson[],
  label: string,
): ComuneItaliaJson | undefined {
  const t = label.trim();
  return rows.find((r) => labelComune(r) === t);
}
