import { rutaPermitida } from "@/config/acceso-rutas";
import {
  nombreLocatario,
  type Contrato,
  type FuentesLocatario,
  type Local,
  type Locatario,
  type Plaza,
  type Prospecto,
  type Rol,
  type Terreno,
} from "@/domain";

/** Tope de resultados por grupo del buscador. */
export const MAX_POR_GRUPO = 6;

export interface FuentesBusqueda {
  plazas: readonly Plaza[];
  locales: readonly Local[];
  locatarios: readonly Locatario[];
  /** Contratos vivos: los del seed más los que nacieron de cotizaciones en la demo. */
  contratos: readonly Contrato[];
  /** Prospectos visibles para la sesión: los que lista el grupo de prospectos. */
  prospectos: readonly Prospecto[];
  /** De dónde sale el nombre del locatario de cada contrato (`nombreLocatario`). */
  fuentesLocatario: FuentesLocatario;
  terrenos: readonly Terreno[];
}

export interface LocalEncontrado {
  local: Local;
  plaza?: string;
}

export interface ContratoEncontrado {
  contrato: Contrato;
  /** Folio que muestra /contratos (CTR-…); el id si el contrato no tiene folio. */
  folio: string;
  codigoLocal?: string;
  locatario: string;
}

export interface ResultadosBusqueda {
  plazas: Plaza[];
  locales: LocalEncontrado[];
  locatarios: Locatario[];
  contratos: ContratoEncontrado[];
  prospectos: Prospecto[];
  terrenos: Terreno[];
}

/**
 * Ruta base (solo pathname) a la que lleva cada grupo del buscador. Un grupo
 * cuya ruta el rol no abre sale vacío, así el buscador no ofrece lo que el
 * candado de ruta cerraría.
 */
export const RUTA_GRUPO: Record<keyof ResultadosBusqueda, string> = {
  plazas: "/plazas",
  locales: "/plazas",
  locatarios: "/contratos",
  contratos: "/contratos",
  prospectos: "/prospectos",
  terrenos: "/terrenos-y-proyectos",
};

/** ¿El rol ve los resultados de este grupo? */
export function grupoVisible(rol: Rol, grupo: keyof ResultadosBusqueda): boolean {
  return rutaPermitida(rol, RUTA_GRUPO[grupo]);
}

/**
 * Resultados del buscador global por grupo, acotados a `MAX_POR_GRUPO`. Cada
 * entidad se busca por lo que la UI muestra de ella; sin consulta devuelve los
 * primeros de cada grupo. Los grupos cuya ruta no abre el rol salen vacíos.
 */
export function buscarGlobal(
  fuentes: FuentesBusqueda,
  consulta: string,
  rol: Rol,
): ResultadosBusqueda {
  const q = consulta.trim().toLowerCase();
  const filtrar = <T>(
    grupo: keyof ResultadosBusqueda,
    lista: readonly T[],
    texto: (x: T) => string,
  ) =>
    grupoVisible(rol, grupo)
      ? lista
          .filter((x) => q === "" || texto(x).toLowerCase().includes(q))
          .slice(0, MAX_POR_GRUPO)
      : [];

  const plazaPorId = new Map(fuentes.plazas.map((p) => [p.id, p.nombre]));
  const codigoPorLocal = new Map(fuentes.locales.map((l) => [l.id, l.codigo]));

  const locales = fuentes.locales.map((local) => ({
    local,
    plaza: plazaPorId.get(local.plazaId),
  }));
  const contratos = fuentes.contratos.map((contrato) => ({
    contrato,
    folio: contrato.folio ?? contrato.id,
    codigoLocal: codigoPorLocal.get(contrato.localId),
    locatario: nombreLocatario(contrato.locatarioId, fuentes.fuentesLocatario),
  }));

  return {
    plazas: filtrar("plazas", fuentes.plazas, (p) => p.nombre),
    locales: filtrar("locales", locales, (l) => `${l.local.codigo} ${l.plaza ?? ""}`),
    locatarios: filtrar("locatarios", fuentes.locatarios, (l) => l.nombre),
    contratos: filtrar(
      "contratos",
      contratos,
      (c) => `${c.folio} ${c.contrato.id} ${c.codigoLocal ?? ""} ${c.locatario}`,
    ),
    prospectos: filtrar(
      "prospectos",
      fuentes.prospectos,
      (p) => `${p.nombre} ${p.rfc} ${p.giro}`,
    ),
    terrenos: filtrar("terrenos", fuentes.terrenos, (t) => t.nombre),
  };
}
