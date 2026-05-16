/** Evita attese infinite su promise che non risolvono (es. SDK nel browser). */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  stepLabel: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `${stepLabel}: troppo tempo (${Math.round(ms / 1000)}s). Ricarica la pagina (F5) e riprova.`,
          ),
        );
      }, ms);
    }),
  ]);
}
