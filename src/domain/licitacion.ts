import type { FechaISO, Licitacion, PropuestaRonda, RondaLicitacion } from "./tipos";

/** Montos de una ronda por proveedor; `null` = no respondió. */
export type EntradaRonda = Readonly<Record<string, number | null>>;

/** Errores de la captura de una ronda: uno general y uno por proveedor. */
export interface ErroresRonda {
  general?: string;
  montos: Record<string, string>;
}

export interface TasaRespuesta {
  invitados: number;
  respondieron: number;
  /** Fracción 0-1 (0 si no hay invitados). */
  fraccion: number;
}

export interface MejorPropuesta {
  ronda: number;
  proveedorId: string;
  monto: number;
}

/** Diferencia de un monto contra el presupuesto base; negativa = por debajo del base. */
export interface ComparacionBase {
  diferencia: number;
  /** Fracción de la diferencia sobre el base. */
  fraccion: number;
}

function ultimaRonda(licitacion: Licitacion): RondaLicitacion | undefined {
  return licitacion.rondas[licitacion.rondas.length - 1];
}

function montoDe(propuesta: PropuestaRonda | undefined): number | undefined {
  return propuesta?.respondio ? propuesta.monto : undefined;
}

/** Monto que un proveedor ofreció en una ronda (`undefined` si no respondió o no participó). */
export function montoEnRonda(
  ronda: RondaLicitacion,
  proveedorId: string,
): number | undefined {
  return montoDe(ronda.propuestas.find((p) => p.proveedorId === proveedorId));
}

/** Cuántos de los invitados respondieron en alguna ronda. */
export function tasaRespuesta(licitacion: Licitacion): TasaRespuesta {
  const invitados = licitacion.invitados.length;
  const respondieron = licitacion.invitados.filter((id) =>
    licitacion.rondas.some((r) => montoEnRonda(r, id) !== undefined),
  ).length;
  return {
    invitados,
    respondieron,
    fraccion: invitados === 0 ? 0 : respondieron / invitados,
  };
}

/** Proveedores que siguen compitiendo (y participan en la siguiente ronda): los que respondieron la última ronda y no fueron descartados. */
export function proveedoresActivos(licitacion: Licitacion): string[] {
  const ultima = ultimaRonda(licitacion);
  const descartados = new Set(licitacion.descartados.map((d) => d.proveedorId));
  if (!ultima) return [...licitacion.invitados];
  return ultima.propuestas
    .filter((p) => p.respondio && !descartados.has(p.proveedorId))
    .map((p) => p.proveedorId);
}

/** La mejor (menor) propuesta de cada ronda. */
export function mejorPropuestaPorRonda(licitacion: Licitacion): MejorPropuesta[] {
  const mejores: MejorPropuesta[] = [];
  for (const ronda of licitacion.rondas) {
    let mejor: MejorPropuesta | undefined;
    for (const propuesta of ronda.propuestas) {
      const monto = montoDe(propuesta);
      if (monto === undefined) continue;
      if (!mejor || monto < mejor.monto) {
        mejor = { ronda: ronda.numero, proveedorId: propuesta.proveedorId, monto };
      }
    }
    if (mejor) mejores.push(mejor);
  }
  return mejores;
}

/** Primera propuesta que hizo un proveedor, en la ronda en que respondió por primera vez. */
export function primeraPropuesta(
  licitacion: Licitacion,
  proveedorId: string,
): number | undefined {
  for (const ronda of licitacion.rondas) {
    const monto = montoEnRonda(ronda, proveedorId);
    if (monto !== undefined) return monto;
  }
  return undefined;
}

/** Ahorro logrado al negociar: la primera propuesta del ganador menos lo adjudicado. */
export function ahorroNegociacion(licitacion: Licitacion): number | undefined {
  if (licitacion.estado !== "ADJUDICADA") return undefined;
  const { ganadorId, montoAdjudicado } = licitacion;
  if (ganadorId === undefined || montoAdjudicado === undefined) return undefined;
  const inicial = primeraPropuesta(licitacion, ganadorId);
  return inicial === undefined ? undefined : inicial - montoAdjudicado;
}

/** Compara un monto contra el presupuesto base de la licitación. */
export function compararContraBase(
  monto: number,
  presupuestoBase: number,
): ComparacionBase {
  const diferencia = monto - presupuestoBase;
  return {
    diferencia,
    fraccion: presupuestoBase === 0 ? 0 : diferencia / presupuestoBase,
  };
}

/** Lo adjudicado contra el base (solo con la licitación adjudicada). */
export function compararAdjudicadoContraBase(
  licitacion: Licitacion,
): ComparacionBase | undefined {
  return licitacion.montoAdjudicado === undefined
    ? undefined
    : compararContraBase(licitacion.montoAdjudicado, licitacion.presupuestoBase);
}

// --- reglas de captura -------------------------------------------------------

const MSJ_MOTIVO = "Escribe el motivo.";

export function errorMotivo(motivo: string): string | undefined {
  return motivo.trim() === "" ? MSJ_MOTIVO : undefined;
}

/** Reglas de una ronda: solo la capturan licitaciones en curso, con todos los participantes. */
export function erroresRonda(
  licitacion: Licitacion,
  entrada: EntradaRonda,
): ErroresRonda {
  const errores: ErroresRonda = { montos: {} };
  if (licitacion.estado !== "EN_CURSO") {
    errores.general = "La licitación ya está adjudicada.";
    return errores;
  }
  const participantes = proveedoresActivos(licitacion);
  if (participantes.length === 0) {
    errores.general = "No quedan proveedores en la competencia.";
    return errores;
  }
  let respuestas = 0;
  for (const id of participantes) {
    const monto = entrada[id];
    if (monto === null) continue;
    if (monto === undefined || !Number.isFinite(monto) || monto <= 0) {
      errores.montos[id] = "Captura un monto mayor a cero o marca que no respondió.";
    } else {
      respuestas += 1;
    }
  }
  if (Object.keys(errores.montos).length === 0 && respuestas === 0) {
    errores.general = "Al menos un proveedor debe responder la ronda.";
  }
  return errores;
}

export function rondaSinErrores(errores: ErroresRonda): boolean {
  return errores.general === undefined && Object.keys(errores.montos).length === 0;
}

/** Descartar exige una licitación en curso, un proveedor activo y el motivo. */
export function errorDescarte(
  licitacion: Licitacion,
  proveedorId: string,
  motivo: string,
): string | undefined {
  if (licitacion.estado !== "EN_CURSO") return "La licitación ya está adjudicada.";
  if (!proveedoresActivos(licitacion).includes(proveedorId)) {
    return "El proveedor ya no está en la competencia.";
  }
  return errorMotivo(motivo);
}

/** Adjudicar exige que el ganador haya respondido la última ronda y un motivo. */
export function errorAdjudicacion(
  licitacion: Licitacion,
  ganadorId: string,
  motivo: string,
): string | undefined {
  if (licitacion.estado !== "EN_CURSO") return "La licitación ya está adjudicada.";
  const ultima = ultimaRonda(licitacion);
  if (!ultima) return "Registra al menos una ronda antes de adjudicar.";
  if (ganadorId === "" || montoEnRonda(ultima, ganadorId) === undefined) {
    return "El ganador debe haber respondido en la última ronda.";
  }
  if (!proveedoresActivos(licitacion).includes(ganadorId)) {
    return "El ganador ya fue descartado.";
  }
  return errorMotivo(motivo);
}

// --- transiciones puras ------------------------------------------------------

/** Agrega la siguiente ronda; si la captura no es válida devuelve la licitación igual. */
export function conRondaRegistrada(
  licitacion: Licitacion,
  entrada: EntradaRonda,
  fecha: FechaISO,
): Licitacion {
  if (!rondaSinErrores(erroresRonda(licitacion, entrada))) return licitacion;
  const propuestas: PropuestaRonda[] = proveedoresActivos(licitacion).map((id) => {
    const monto = entrada[id];
    return typeof monto === "number"
      ? { proveedorId: id, respondio: true, monto }
      : { proveedorId: id, respondio: false };
  });
  return {
    ...licitacion,
    rondas: [
      ...licitacion.rondas,
      { numero: licitacion.rondas.length + 1, fecha, propuestas },
    ],
  };
}

/** Saca a un proveedor de la competencia al cierre de la última ronda. */
export function conProveedorDescartado(
  licitacion: Licitacion,
  proveedorId: string,
  motivo: string,
): Licitacion {
  if (errorDescarte(licitacion, proveedorId, motivo) !== undefined) return licitacion;
  return {
    ...licitacion,
    descartados: [
      ...licitacion.descartados,
      { proveedorId, ronda: licitacion.rondas.length, motivo: motivo.trim() },
    ],
  };
}

/** Cierra la licitación con el monto que el ganador ofreció en la última ronda. */
export function conLicitacionAdjudicada(
  licitacion: Licitacion,
  ganadorId: string,
  motivo: string,
  autor: string,
  fecha: FechaISO,
): Licitacion {
  if (errorAdjudicacion(licitacion, ganadorId, motivo) !== undefined) return licitacion;
  const ultima = ultimaRonda(licitacion);
  const monto = ultima ? montoEnRonda(ultima, ganadorId) : undefined;
  if (monto === undefined) return licitacion;
  return {
    ...licitacion,
    estado: "ADJUDICADA",
    ganadorId,
    montoAdjudicado: monto,
    motivoSeleccion: motivo.trim(),
    adjudicadaPor: autor,
    adjudicadaEn: fecha,
  };
}
