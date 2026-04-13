export type GeocodeNegozioResult =
  | { ok: true; lat: number; lng: number }
  | { ok: true; lat: null; lng: null; warning?: string }
  | { ok: false; error: string };

export async function geocodeViaEComune(via: string, comuneLabel: string): Promise<GeocodeNegozioResult> {
  const res = await fetch("/api/geocode-negozio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ via: via.trim(), comuneLabel: comuneLabel.trim() }),
  });
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return { ok: false, error: "Risposta dal server non valida." };
  }
  const o = raw as Record<string, unknown>;
  if (!res.ok) {
    const err = o.error;
    return { ok: false, error: typeof err === "string" ? err : "Geocoding non riuscito." };
  }
  if (typeof o.lat === "number" && typeof o.lng === "number") {
    return { ok: true, lat: o.lat, lng: o.lng };
  }
  return {
    ok: true,
    lat: null,
    lng: null,
    warning: typeof o.warning === "string" ? o.warning : undefined,
  };
}
