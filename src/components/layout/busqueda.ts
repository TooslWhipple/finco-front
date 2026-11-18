import {
  nombreLocatario,
  type Contrato,
  type FuentesLocatario,
  type Local,
  type Locatario,
  type Plaza,
  type Prospecto,
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
 * Resultados del buscador global por grupo, acotados a `MAX_POR_GRUPO`. Cada
 * entidad se busca por lo que la UI muestra de ella; sin consulta devuelve los
 * primeros de cada grupo.
 */
export function buscarGlobal(
  fuentes: FuentesBusqueda,
  consulta: string,
): ResultadosBusqueda {
  const q = consulta.trim().toLowerCase();
  const filtrar = <T>(lista: readonly T[], texto: (x: T) => string) =>
    lista
      .filter((x) => q === "" || texto(x).toLowerCase().includes(q))
      .slice(0, MAX_POR_GRUPO);

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
    plazas: filtrar(fuentes.plazas, (p) => p.nombre),
    locales: filtrar(locales, (l) => `${l.local.codigo} ${l.plaza ?? ""}`),
    locatarios: filtrar(fuentes.locatarios, (l) => l.nombre),
    contratos: filtrar(
      contratos,
      (c) => `${c.folio} ${c.contrato.id} ${c.codigoLocal ?? ""} ${c.locatario}`,
    ),
    prospectos: filtrar(fuentes.prospectos, (p) => `${p.nombre} ${p.rfc} ${p.giro}`),
    terrenos: filtrar(fuentes.terrenos, (t) => t.nombre),
  };
}
