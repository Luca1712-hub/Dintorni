import type { AuthError } from "@supabase/supabase-js";

export function mapAuthErrorToMessage(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("already registered") || msg.includes("user already")) {
    return "Questa email e` gia` registrata. Vai alla pagina Accedi.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Email o password non corretti.";
  }
  if (msg.includes("email not confirmed")) {
    return "Devi prima confermare l'email: controlla la casella di posta.";
  }

  return error.message || "Si e` verificato un errore. Riprova tra poco.";
}
