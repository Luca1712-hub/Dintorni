/** Deve coincidere con la verifica in `POST /api/account/delete`. */
export const FRASE_ELIMINAZIONE_ACCOUNT = "Elimina il mio account";

export function confermaEliminazioneAccount(fraseDigitata: string): boolean {
  return fraseDigitata.trim().toLowerCase() === FRASE_ELIMINAZIONE_ACCOUNT.toLowerCase();
}
