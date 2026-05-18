/** Porta in fondo l'area scrollabile dei messaggi (dopo paint e allegati). */
export function scrollListaMessaggiInFondo(
  el: HTMLElement | null,
  behavior: ScrollBehavior = "auto",
): void {
  if (!el) return;

  const snap = () => {
    if (behavior === "auto") {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
  };

  snap();
  requestAnimationFrame(() => {
    snap();
    requestAnimationFrame(snap);
  });
  window.setTimeout(snap, 150);
}
