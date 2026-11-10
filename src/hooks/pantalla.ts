"use client";

import { useSyncExternalStore } from "react";

/** Consulta de `lg` de Tailwind (1024 px): el corte entre iPad vertical y horizontal. */
const CONSULTA_LG = "(min-width: 1024px)";

function suscribir(avisar: () => void): () => void {
  const mql = window.matchMedia(CONSULTA_LG);
  mql.addEventListener("change", avisar);
  return () => mql.removeEventListener("change", avisar);
}

/**
 * `true` desde `lg` (1024 px). Sirve para decidir *estructura* (panel lateral vs hoja
 * deslizable); lo meramente visual se resuelve con clases `lg:` y no con este hook.
 * En el servidor asume escritorio, así que el primer pintado no parpadea en él.
 */
export function useEsLg(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA_LG).matches,
    () => true,
  );
}

const CONSULTA_TACTIL = "(pointer: coarse)";

function suscribirTactil(avisar: () => void): () => void {
  const mql = window.matchMedia(CONSULTA_TACTIL);
  mql.addEventListener("change", avisar);
  return () => mql.removeEventListener("change", avisar);
}

/** `true` si el puntero principal es táctil (iPad). En el servidor asume ratón. */
export function useEsTactil(): boolean {
  return useSyncExternalStore(
    suscribirTactil,
    () => window.matchMedia(CONSULTA_TACTIL).matches,
    () => false,
  );
}
