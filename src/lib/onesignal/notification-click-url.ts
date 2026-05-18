/** Estrae l'URL di destinazione da un evento click OneSignal (campi vari tra versioni). */
export function urlDaClickNotifica(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const e = event as {
    notification?: {
      launchUrl?: string;
      url?: string;
      additionalData?: { url?: string };
    };
    result?: { url?: string };
  };
  const candidates = [
    e.notification?.launchUrl,
    e.notification?.url,
    e.notification?.additionalData?.url,
    e.result?.url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export function navigaSeDiverso(url: string): void {
  if (typeof window === "undefined") return;
  try {
    const target = new URL(url, window.location.origin).href;
    if (window.location.href !== target) {
      window.location.assign(target);
    }
  } catch {
    /* URL non valido */
  }
}
