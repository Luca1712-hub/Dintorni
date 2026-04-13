/** Categorie merceologiche allineate a registrazione negozio e richieste acquirente. */
export const CATEGORIE_MERCEOLOGICHE = [
  "Alimentari",
  "Abbigliamento",
  "Elettronica",
  "Casa e Arredo",
  "Ferramenta",
  "Sport",
  "Farmacia e Benessere",
  "Libri e Cartoleria",
  "Auto e Moto",
] as const;

export type CategoriaNegozio = (typeof CATEGORIE_MERCEOLOGICHE)[number];

export const MAX_CATEGORIE_RICHIESTA = 3;
