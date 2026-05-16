/** Uscita account tramite route server (non blocca su signOut nel browser). */
export function esciDallAccount(): void {
  window.location.assign("/api/auth/sign-out");
}
