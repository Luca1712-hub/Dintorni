import { type NextRequest, NextResponse } from "next/server";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const SITE_ACCESS_COOKIE = "dintorni-site-access";

const HMAC_SALT = "dintorni-site-access-v1";

export function isSiteAccessEnabled(): boolean {
  const password = process.env.SITE_ACCESS_PASSWORD?.trim();
  return Boolean(password);
}

export function isSiteAccessPathExempt(pathname: string): boolean {
  if (pathname === "/site-access") return true;
  if (pathname.startsWith("/api/site-access")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/chat/")) return true;
  if (pathname.startsWith("/onesignal/")) return true;
  return false;
}

export function sanitizeSiteAccessNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeSiteAccessToken(password: string): Promise<string> {
  return hmacSha256Hex(password, HMAC_SALT);
}

export async function getExpectedSiteAccessToken(): Promise<string | null> {
  const password = process.env.SITE_ACCESS_PASSWORD?.trim();
  if (!password) return null;
  return computeSiteAccessToken(password);
}

export function hasValidSiteAccessCookie(
  request: NextRequest,
  expectedToken: string,
): boolean {
  const cookie = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (!cookie) return false;
  if (cookie.length !== expectedToken.length) return false;
  return safeEqual(cookie, expectedToken);
}

export function verifySiteAccessPassword(candidate: string): boolean {
  const expected = process.env.SITE_ACCESS_PASSWORD?.trim();
  if (!expected) return false;
  const cand = candidate.trim();
  if (cand.length !== expected.length) return false;
  return safeEqual(cand, expected);
}

export function siteAccessCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Blocca le richieste se la protezione è attiva e manca il cookie valido. */
export async function enforceSiteAccess(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (!isSiteAccessEnabled()) return null;

  const pathname = request.nextUrl.pathname;
  if (isSiteAccessPathExempt(pathname)) return null;

  const expectedToken = await getExpectedSiteAccessToken();
  if (expectedToken && hasValidSiteAccessCookie(request, expectedToken)) {
    return null;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/site-access";
  loginUrl.search = "";
  const nextPath = pathname + request.nextUrl.search;
  if (nextPath !== "/site-access") {
    loginUrl.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(loginUrl);
}
