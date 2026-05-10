/** True se è configurato l’integrazione OneSignal (client + server per l’invio). */
export function isOnesignalPushConfigured(): boolean {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  const restKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  return Boolean(appId && restKey);
}

export function getOnesignalAppId(): string {
  const id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  if (!id) throw new Error("Manca NEXT_PUBLIC_ONESIGNAL_APP_ID");
  return id;
}

export function getOnesignalRestApiKey(): string {
  const k = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!k) throw new Error("Manca ONESIGNAL_REST_API_KEY");
  return k;
}
