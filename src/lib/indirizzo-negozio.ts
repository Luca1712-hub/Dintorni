/** Stesso separatore usato in registrazione tra via e comune. */
const JOINER = " · ";

/** Riconosce etichetta "Nome (SIGLA)" con sigla di 2 lettere maiuscole. */
function sembraEtichettaComune(s: string): boolean {
  return /^.+\([A-Z]{2}\)$/.test(s.trim());
}

/**
 * Separa il valore salvato in `profiles.indirizzo_negozio` in via e comune (elenco).
 * Se il formato non e` quello nuovo, tutto finisce in `via` e `comuneLabel` resta vuoto.
 */
export function splitIndirizzoNegozio(full: string | null | undefined): {
  via: string;
  comuneLabel: string;
} {
  const t = (full ?? "").trim();
  if (!t) return { via: "", comuneLabel: "" };
  const idx = t.lastIndexOf(JOINER);
  if (idx < 0) return { via: t, comuneLabel: "" };
  const via = t.slice(0, idx).trim();
  const comuneLabel = t.slice(idx + JOINER.length).trim();
  if (!sembraEtichettaComune(comuneLabel)) {
    return { via: t, comuneLabel: "" };
  }
  return { via, comuneLabel };
}

export function joinIndirizzoNegozio(via: string, comuneLabel: string): string {
  const v = via.trim();
  const c = comuneLabel.trim();
  if (v && c) return `${v}${JOINER}${c}`;
  if (v) return v;
  return c;
}
