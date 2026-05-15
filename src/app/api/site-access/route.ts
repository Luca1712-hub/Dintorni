import { NextResponse } from "next/server";
import {
  computeSiteAccessToken,
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

  const token = await computeSiteAccessToken(password.trim());
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_ACCESS_COOKIE, token, siteAccessCookieOptions());
  return response;
}
