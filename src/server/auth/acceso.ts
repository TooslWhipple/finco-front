/**
 * Decisión de acceso de la barrera del servidor (`src/proxy.ts`). Pura: recibe
 * la ruta pedida y el rol de la sesión (o `null` sin sesión).
 *
 * Es fail-closed: con sesión, una ruta que no pertenece a ningún módulo y no es
 * pública manda al inicio del rol. Una página nueva que se olvide en
 * `REGLAS_RUTA` queda cerrada, no abierta.
 */
import {
  INICIO_POR_ROL,
  RUTA_SIN_ACCESO,
  rutaPermitida,
  rutaTieneDueno,
  RUTAS_PUBLICAS,
} from "@/config/acceso-rutas";
import type { Rol } from "@/domain";

type DecisionAcceso = { tipo: "pasar" } | { tipo: "redirigir"; a: string };

const PASAR: DecisionAcceso = { tipo: "pasar" };

function decodificar(ruta: string): string | null {
  try {
    return decodeURIComponent(ruta);
  } catch {
    return null;
  }
}

export function decidirAcceso(ruta: string, rol: Rol | null): DecisionAcceso {
  const decodificada = decodificar(ruta);
  const esPublica = decodificada !== null && RUTAS_PUBLICAS.includes(decodificada);

  if (rol === null) return esPublica ? PASAR : { tipo: "redirigir", a: RUTA_SIN_ACCESO };

  const inicio: DecisionAcceso = { tipo: "redirigir", a: INICIO_POR_ROL[rol] };
  if (decodificada === null || esPublica) return inicio;
  if (!rutaTieneDueno(decodificada) || !rutaPermitida(rol, decodificada)) return inicio;
  return PASAR;
}
