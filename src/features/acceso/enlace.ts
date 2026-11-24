import { RUTA_ENLACE } from "@/config/acceso-rutas";

const PREFIJO = `${RUTA_ENLACE}/`;

/**
 * Clave de un enlace de acceso pegado por la persona: `https://…/acceso/<clave>`.
 * El tramo tras `/acceso/` se corta en el primer `/`, `?` o `#`. Si el texto no
 * trae `/acceso/`, se devuelve tal cual (recortado): se pudo pegar la clave
 * sola. Devuelve `null` si no queda ninguna clave.
 */
export function claveDeEnlace(texto: string): string | null {
  const limpio = texto.trim();
  const inicio = limpio.indexOf(PREFIJO);
  const candidato =
    inicio === -1
      ? limpio
      : limpio.slice(inicio + PREFIJO.length).split(/[/?#]/, 1)[0] ?? "";
  const clave = candidato.trim();
  return clave === "" ? null : clave;
}
