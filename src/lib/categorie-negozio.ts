/** Categorie merceologiche allineate a registrazione negozio e richieste acquirente. */
export const CATEGORIE_MERCEOLOGICHE = [
  "Abbigliamento",
  "Calzature",
  "Articoli sportivi",
  "Articoli per la casa",
  "Ferramenta",
  "Parafarmacia/Erboristeria",
  "Libreria/Cartoleria",
  "Musica",
  "Giocattoli",
  "Sanitaria",
  "Animali",
  "Ottica",
  "Enoteca",
] as const;

export type CategoriaNegozio = (typeof CATEGORIE_MERCEOLOGICHE)[number];

export const MAX_CATEGORIE_RICHIESTA = 3;
