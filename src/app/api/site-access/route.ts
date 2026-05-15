import { NextResponse } from "next/server";
import {
  getExpectedSiteAccessToken,
  isSiteAccessEnabled,
  SITE_ACCESS_COOKIE,
  siteAccessCookieOptions,
  verifySiteAccessPassword,
} from "@/lib/site-access";

export async function POST(request: Request) {
  if (!isSiteAccessEnabled()) {
    return NextResponse.json({ error: "Protezione sito non attiva." }, { status: 404 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!verifySiteAccessPassword(password)) {
    return NextResponse.json({ error: "Password non corretta." }, { status: 401 });
  }

  const token = await getExpectedSiteAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Configurazione server non valida." }, { status: 500 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_ACCESS_COOKIE, token, siteAccessCookieOptions());
  return response;
}
