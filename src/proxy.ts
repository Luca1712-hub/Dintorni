import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { enforceSiteAccess } from "@/lib/site-access";

export async function proxy(request: NextRequest) {
  const siteAccessResponse = await enforceSiteAccess(request);
  if (siteAccessResponse) return siteAccessResponse;
  return updateSession(request);
}

export const config = {
  matcher: [
    // Escludere /onesignal/* così OneSignal registra gli SW dalla cartella public/ senza proxy (evita 404 su Vercel).
    "/((?!_next/static|_next/image|favicon.ico|onesignal/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
