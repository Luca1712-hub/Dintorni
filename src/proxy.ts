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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
