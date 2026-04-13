import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = { via?: string; comuneLabel?: string };

/**
 * Geocoding lato server (Nominatim OSM). Usa un User-Agent identificabile (policy Nominatim).
 * Se non trova risultati, restituisce lat/lng null (la registrazione puo` proseguire).
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON non valido" }, { status: 400 });
  }

  const via = typeof body.via === "string" ? body.via.trim() : "";
  const comuneLabel = typeof body.comuneLabel === "string" ? body.comuneLabel.trim() : "";
  if (!via || !comuneLabel) {
    return NextResponse.json(
      { ok: false, error: "Servono via e comune (etichetta elenco)." },
      { status: 400 },
    );
  }

  const query = `${via}, ${comuneLabel}, Italia`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const userAgent =
    process.env.GEOCODING_USER_AGENT?.trim() ||
    "DintorniMVP/1.0 (imposta GEOCODING_USER_AGENT in .env.local con email o URL di contatto per Nominatim)";

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": userAgent, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: true, lat: null, lng: null, warning: `Nominatim HTTP ${res.status}` },
        { status: 200 },
      );
    }
    const list = (await res.json()) as { lat?: string; lon?: string }[];
    const first = list?.[0];
    if (!first?.lat || !first?.lon) {
      return NextResponse.json({ ok: true, lat: null, lng: null }, { status: 200 });
    }
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: true, lat: null, lng: null }, { status: 200 });
    }
    return NextResponse.json({ ok: true, lat, lng }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true, lat: null, lng: null, warning: "Errore di rete" }, { status: 200 });
  }
}
