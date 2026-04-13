export type DintorniUserProfile = {
  nome: string;
  nomeNegozio: string | null;
  indirizzoNegozio: string | null;
  categorieNegozio: string[];
  email: string;
  ruolo: "acquirente" | "negozio";
  acceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
  /** Preferenza email per nuovi messaggi in chat (default true se colonna assente). */
  notificheEmail: boolean;
  /** Preferenza invio push per nuovi messaggi (default true se colonna assente). */
  notifichePush: boolean;
};

export type DbProfileRow = {
  id: string;
  email: string;
  nome: string;
  ruolo: "acquirente" | "negozio";
  nome_negozio: string | null;
  indirizzo_negozio: string | null;
  categorie_merceologiche: unknown;
  terms_version: string;
  privacy_version: string;
  accepted_at: string;
  notifiche_email?: boolean | null;
  notifiche_push?: boolean | null;
};

export function mapDbProfileToProfile(row: DbProfileRow): DintorniUserProfile {
  const raw = row.categorie_merceologiche;
  let categorieNegozio: string[] = [];
  if (Array.isArray(raw)) {
    categorieNegozio = raw.filter((item): item is string => typeof item === "string");
  }

  return {
    nome: row.nome,
    nomeNegozio: row.nome_negozio,
    indirizzoNegozio: row.indirizzo_negozio,
    categorieNegozio,
    email: row.email,
    ruolo: row.ruolo,
    acceptedAt: row.accepted_at,
    termsVersion: row.terms_version,
    privacyVersion: row.privacy_version,
    notificheEmail: row.notifiche_email !== false,
    notifichePush: row.notifiche_push !== false,
  };
}
