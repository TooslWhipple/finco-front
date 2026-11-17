import { ANTICIPO_PCT, FONDO_GARANTIA_PCT } from "./obra";
import type {
  CanalAviso,
  ConceptoLicitacion,
  ContratoObra,
  FechaISO,
  InvitacionLicitacion,
  Licitacion,
  PrecioConcepto,
  PropuestaRonda,
  Proveedor,
  RondaLicitacion,
} from "./tipos";

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

/** Quién capturó una respuesta con precios. */
export type CapturaRespuesta = NonNullable<PropuestaRonda["capturadaPor"]>;

/** Fechas del contrato que nace al adjudicar una licitación con catálogo. */
export interface FechasContrato {
  inicioPlan: FechaISO;
  finPlan: FechaISO;
}

/** Errores del catálogo: uno general y uno por concepto (por su `id`). */
export interface ErroresCatalogo {
  general?: string;
  conceptos: Record<string, string>;
}

/** Errores de una respuesta por precio unitario: uno general y uno por concepto. */
export interface ErroresRespuesta {
  general?: string;
  precios: Record<string, string>;
}

const MSJ_RONDA_ABIERTA = "Cierra la ronda abierta.";
const MSJ_ADJUDICADA = "La licitación ya está adjudicada.";

function estaCerrada(ronda: RondaLicitacion): boolean {
  return ronda.estado !== "ABIERTA";
}

/** Rondas que ya cerraron (las históricas no traen estado y cuentan como cerradas). */
export function rondasCerradas(licitacion: Licitacion): RondaLicitacion[] {
  return licitacion.rondas.filter(estaCerrada);
}

/**
 * Última ronda cerrada: la única fuente de los resultados de la licitación
 * (activos, mejores propuestas, ahorro y adjudicación). Una ronda abierta no los cambia.
 */
export function ultimaRondaCerrada(licitacion: Licitacion): RondaLicitacion | undefined {
  const cerradas = rondasCerradas(licitacion);
  return cerradas[cerradas.length - 1];
}

/** La ronda que recibe respuestas, si hay una abierta (siempre es la última). */
export function rondaAbierta(licitacion: Licitacion): RondaLicitacion | undefined {
  const ultima = licitacion.rondas[licitacion.rondas.length - 1];
  return ultima && !estaCerrada(ultima) ? ultima : undefined;
}

export function tieneCatalogo(licitacion: Licitacion): boolean {
  return licitacion.conceptos.length > 0;
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
  const cerradas = rondasCerradas(licitacion);
  const respondieron = licitacion.invitados.filter((id) =>
    cerradas.some((r) => montoEnRonda(r, id) !== undefined),
  ).length;
  return {
    invitados,
    respondieron,
    fraccion: invitados === 0 ? 0 : respondieron / invitados,
  };
}

/** Proveedores que siguen compitiendo (y participan en la siguiente ronda): los que respondieron la última ronda cerrada y no fueron descartados. */
export function proveedoresActivos(licitacion: Licitacion): string[] {
  const ultima = ultimaRondaCerrada(licitacion);
  const descartados = new Set(licitacion.descartados.map((d) => d.proveedorId));
  if (!ultima) return [...licitacion.invitados];
  return ultima.propuestas
    .filter((p) => p.respondio && !descartados.has(p.proveedorId))
    .map((p) => p.proveedorId);
}

/** La mejor (menor) propuesta de cada ronda. */
export function mejorPropuestaPorRonda(licitacion: Licitacion): MejorPropuesta[] {
  const mejores: MejorPropuesta[] = [];
  for (const ronda of rondasCerradas(licitacion)) {
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
  for (const ronda of rondasCerradas(licitacion)) {
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

/** Total de una respuesta por precio unitario: Σ volumen × PU de los conceptos con precio. */
export function montoDePrecios(
  conceptos: readonly ConceptoLicitacion[],
  precios: readonly PrecioConcepto[],
): number {
  return conceptos.reduce((total, concepto) => {
    const precio = precios.find((p) => p.conceptoId === concepto.id);
    return total + (precio ? concepto.volumen * precio.precioUnitario : 0);
  }, 0);
}

/** Licitaciones que un proveedor ve en su portal: en curso, con catálogo y con invitación suya. */
export function licitacionesDeProveedor(
  licitaciones: readonly Licitacion[],
  proveedorId: string,
): Licitacion[] {
  return licitaciones.filter(
    (l) =>
      l.estado === "EN_CURSO" &&
      tieneCatalogo(l) &&
      l.invitaciones.some((i) => i.proveedorId === proveedorId),
  );
}

/** Invitaciones que convocan a una ronda (las ligadas a su número, nunca por fecha). */
export function invitacionesDeRonda(
  licitacion: Licitacion,
  ronda: RondaLicitacion,
): InvitacionLicitacion[] {
  return licitacion.invitaciones.filter((i) => i.ronda === ronda.numero);
}

/** Si el proveedor está en la ronda abierta y recibió la invitación para ella. */
export function invitadoARondaAbierta(
  licitacion: Licitacion,
  proveedorId: string,
): boolean {
  const abierta = rondaAbierta(licitacion);
  if (!abierta) return false;
  return (
    abierta.propuestas.some((p) => p.proveedorId === proveedorId) &&
    invitacionesDeRonda(licitacion, abierta).some((i) => i.proveedorId === proveedorId)
  );
}

/** Cómo ve un proveedor la licitación en su portal. */
export type EstadoEnPortal = "POR_RESPONDER" | "RESPONDIDA" | "RONDA_CERRADA" | "FUERA";

/**
 * Estado de la licitación para el proveedor: sin ronda abierta, "ronda cerrada";
 * con ella, por responder o respondida si participa y tiene su invitación, y fuera
 * de la ronda si no (descartado o sin invitación).
 */
export function estadoEnPortal(
  licitacion: Licitacion,
  proveedorId: string,
): EstadoEnPortal {
  const abierta = rondaAbierta(licitacion);
  if (!abierta) return "RONDA_CERRADA";
  if (!invitadoARondaAbierta(licitacion, proveedorId)) return "FUERA";
  const propuesta = abierta.propuestas.find((p) => p.proveedorId === proveedorId);
  return propuesta?.respondio ? "RESPONDIDA" : "POR_RESPONDER";
}

/** Rondas con respuestas por precio unitario, en orden (abiertas o cerradas). */
export function rondasConPrecios(licitacion: Licitacion): number[] {
  return licitacion.rondas
    .filter((r) => r.propuestas.some((p) => p.precios !== undefined))
    .map((r) => r.numero);
}

export interface FilaComparativo {
  concepto: ConceptoLicitacion;
  /** Precio unitario de cada proveedor (por id); ausente si no cotizó el concepto. */
  precios: Readonly<Record<string, number>>;
  /** Proveedor con el precio unitario más bajo (el primero en caso de empate). */
  masBajoId?: string;
}

export interface ComparativoConceptos {
  ronda: number;
  /** Proveedores que respondieron con precios, sin los descartados. */
  proveedorIds: string[];
  filas: FilaComparativo[];
  /** Total de cada proveedor (volumen × PU). */
  totales: Readonly<Record<string, number>>;
}

/**
 * Precio unitario de cada proveedor por concepto en una ronda; por omisión, la
 * última ronda con precios. Excluye a los descartados.
 */
export function comparativoPorConcepto(
  licitacion: Licitacion,
  numeroRonda?: number,
): ComparativoConceptos | undefined {
  const numero = numeroRonda ?? rondasConPrecios(licitacion).at(-1);
  const ronda = licitacion.rondas.find((r) => r.numero === numero);
  if (!ronda) return undefined;
  const descartados = new Set(licitacion.descartados.map((d) => d.proveedorId));
  const propuestas = ronda.propuestas.filter(
    (p) => p.respondio && p.precios !== undefined && !descartados.has(p.proveedorId),
  );
  const filas = licitacion.conceptos.map((concepto): FilaComparativo => {
    const precios: Record<string, number> = {};
    let masBajoId: string | undefined;
    for (const p of propuestas) {
      const precio = p.precios?.find((x) => x.conceptoId === concepto.id);
      if (!precio) continue;
      precios[p.proveedorId] = precio.precioUnitario;
      if (masBajoId === undefined || precio.precioUnitario < precios[masBajoId]) {
        masBajoId = p.proveedorId;
      }
    }
    return { concepto, precios, masBajoId };
  });
  const totales: Record<string, number> = {};
  for (const p of propuestas) {
    totales[p.proveedorId] = montoDePrecios(licitacion.conceptos, p.precios ?? []);
  }
  return {
    ronda: ronda.numero,
    proveedorIds: propuestas.map((p) => p.proveedorId),
    filas,
    totales,
  };
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
    errores.general = MSJ_ADJUDICADA;
    return errores;
  }
  if (rondaAbierta(licitacion)) {
    errores.general = MSJ_RONDA_ABIERTA;
    return errores;
  }
  if (tieneCatalogo(licitacion)) {
    errores.general = "Con catálogo, la ronda se responde por precio unitario.";
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
  if (licitacion.estado !== "EN_CURSO") return MSJ_ADJUDICADA;
  if (rondaAbierta(licitacion)) return MSJ_RONDA_ABIERTA;
  if (!proveedoresActivos(licitacion).includes(proveedorId)) {
    return "El proveedor ya no está en la competencia.";
  }
  return errorMotivo(motivo);
}

/**
 * Adjudicar exige que no haya ronda abierta, que el ganador haya respondido la
 * última ronda cerrada (con precio para cada concepto si hay catálogo) y un motivo.
 */
export function errorAdjudicacion(
  licitacion: Licitacion,
  ganadorId: string,
  motivo: string,
): string | undefined {
  if (licitacion.estado !== "EN_CURSO") return MSJ_ADJUDICADA;
  if (rondaAbierta(licitacion)) return MSJ_RONDA_ABIERTA;
  const ultima = ultimaRondaCerrada(licitacion);
  if (!ultima) return "Registra al menos una ronda antes de adjudicar.";
  if (ganadorId === "" || montoEnRonda(ultima, ganadorId) === undefined) {
    return "El ganador debe haber respondido en la última ronda.";
  }
  if (!proveedoresActivos(licitacion).includes(ganadorId)) {
    return "El ganador ya fue descartado.";
  }
  if (tieneCatalogo(licitacion) && !preciosCompletos(licitacion, ultima, ganadorId)) {
    return "El ganador debe tener precio para cada concepto en la última ronda.";
  }
  return errorMotivo(motivo);
}

function preciosDe(ronda: RondaLicitacion, proveedorId: string): PrecioConcepto[] {
  return ronda.propuestas.find((p) => p.proveedorId === proveedorId)?.precios ?? [];
}

function preciosCompletos(
  licitacion: Licitacion,
  ronda: RondaLicitacion,
  proveedorId: string,
): boolean {
  const precios = preciosDe(ronda, proveedorId);
  return licitacion.conceptos.every((c) =>
    precios.some((p) => p.conceptoId === c.id && p.precioUnitario > 0),
  );
}

/** El contrato que nace al adjudicar arranca después de hoy y termina en o tras su inicio. */
export function errorFechasContrato(
  fechas: FechasContrato,
  hoy: FechaISO,
): string | undefined {
  if (fechas.inicioPlan === "" || fechas.finPlan === "") {
    return "Captura el inicio y el fin del contrato.";
  }
  if (fechas.inicioPlan <= hoy) return "El contrato debe iniciar después de hoy.";
  if (fechas.finPlan < fechas.inicioPlan) {
    return "El fin no puede ser anterior al inicio.";
  }
  return undefined;
}

/** Por qué el catálogo ya no se puede editar: solo se edita en curso y mientras ninguna ronda tenga precios. */
export function errorEdicionCatalogo(licitacion: Licitacion): string | undefined {
  if (licitacion.estado !== "EN_CURSO") return MSJ_ADJUDICADA;
  if (rondasConPrecios(licitacion).length > 0) {
    return "El catálogo ya tiene precios capturados; no se puede editar.";
  }
  return undefined;
}

export function catalogoEditable(licitacion: Licitacion): boolean {
  return errorEdicionCatalogo(licitacion) === undefined;
}

/** Reglas del catálogo: editable (`errorEdicionCatalogo`), al menos un concepto y cada uno completo. */
export function erroresCatalogo(
  licitacion: Licitacion,
  conceptos: readonly ConceptoLicitacion[],
): ErroresCatalogo {
  const errores: ErroresCatalogo = { conceptos: {} };
  const noEditable = errorEdicionCatalogo(licitacion);
  if (noEditable !== undefined) {
    errores.general = noEditable;
    return errores;
  }
  if (conceptos.length === 0) {
    errores.general = "Agrega al menos un concepto.";
    return errores;
  }
  const claves = new Map<string, number>();
  for (const c of conceptos) {
    const clave = c.clave.trim().toUpperCase();
    claves.set(clave, (claves.get(clave) ?? 0) + 1);
  }
  for (const c of conceptos) {
    const clave = c.clave.trim().toUpperCase();
    if (clave === "") errores.conceptos[c.id] = "Escribe la clave.";
    else if ((claves.get(clave) ?? 0) > 1)
      errores.conceptos[c.id] = "La clave se repite.";
    else if (c.descripcion.trim() === "")
      errores.conceptos[c.id] = "Escribe la descripción.";
    else if (!Number.isFinite(c.volumen) || c.volumen <= 0) {
      errores.conceptos[c.id] = "El volumen debe ser mayor a cero.";
    }
  }
  return errores;
}

export function catalogoSinErrores(errores: ErroresCatalogo): boolean {
  return errores.general === undefined && Object.keys(errores.conceptos).length === 0;
}

/** Enviar invitaciones exige una licitación en curso y con catálogo. */
export function errorInvitaciones(licitacion: Licitacion): string | undefined {
  if (licitacion.estado !== "EN_CURSO") return MSJ_ADJUDICADA;
  if (!tieneCatalogo(licitacion)) return "Define el catálogo antes de invitar.";
  return undefined;
}

/** Quiénes reciben la invitación al enviar: los activos de la ronda (abierta o siguiente). */
export function participantesDeEnvio(licitacion: Licitacion): string[] {
  const abierta = rondaAbierta(licitacion);
  if (abierta) return abierta.propuestas.map((p) => p.proveedorId);
  return proveedoresActivos(licitacion);
}

/** Participantes de la ronda abierta que aún no tienen su invitación. */
export function pendientesDeInvitar(licitacion: Licitacion): string[] {
  const abierta = rondaAbierta(licitacion);
  if (!abierta) return participantesDeEnvio(licitacion);
  const invitados = new Set(
    invitacionesDeRonda(licitacion, abierta).map((i) => i.proveedorId),
  );
  return participantesDeEnvio(licitacion).filter((id) => !invitados.has(id));
}

/** Responder exige la ronda abierta, un participante de ella y precio > 0 para cada concepto. */
export function erroresRespuesta(
  licitacion: Licitacion,
  proveedorId: string,
  precios: readonly PrecioConcepto[],
): ErroresRespuesta {
  const errores: ErroresRespuesta = { precios: {} };
  if (licitacion.estado !== "EN_CURSO") {
    errores.general = MSJ_ADJUDICADA;
    return errores;
  }
  const abierta = rondaAbierta(licitacion);
  if (!abierta) {
    errores.general = "No hay una ronda abierta.";
    return errores;
  }
  if (!abierta.propuestas.some((p) => p.proveedorId === proveedorId)) {
    errores.general = "El proveedor no participa en la ronda abierta.";
    return errores;
  }
  for (const concepto of licitacion.conceptos) {
    const precio = precios.find((p) => p.conceptoId === concepto.id)?.precioUnitario;
    if (precio === undefined || !Number.isFinite(precio) || precio <= 0) {
      errores.precios[concepto.id] = "Captura un precio unitario mayor a cero.";
    }
  }
  return errores;
}

export function respuestaSinErrores(errores: ErroresRespuesta): boolean {
  return errores.general === undefined && Object.keys(errores.precios).length === 0;
}

/** Cerrar la ronda abierta exige que al menos un participante haya respondido. */
export function errorCierreRonda(licitacion: Licitacion): string | undefined {
  const abierta = rondaAbierta(licitacion);
  if (!abierta) return "No hay una ronda abierta.";
  if (!abierta.propuestas.some((p) => p.respondio)) {
    return "Al menos un proveedor debe responder antes de cerrar la ronda.";
  }
  return undefined;
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
      {
        proveedorId,
        ronda: ultimaRondaCerrada(licitacion)?.numero ?? 0,
        motivo: motivo.trim(),
      },
    ],
  };
}

/** Cierra la licitación con el monto que el ganador ofreció en la última ronda cerrada. */
export function conLicitacionAdjudicada(
  licitacion: Licitacion,
  ganadorId: string,
  motivo: string,
  autor: string,
  fecha: FechaISO,
): Licitacion {
  if (errorAdjudicacion(licitacion, ganadorId, motivo) !== undefined) return licitacion;
  const ultima = ultimaRondaCerrada(licitacion);
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

/** Reemplaza el catálogo; si no es válido devuelve la licitación igual. */
export function conCatalogo(
  licitacion: Licitacion,
  conceptos: readonly ConceptoLicitacion[],
): Licitacion {
  if (!catalogoSinErrores(erroresCatalogo(licitacion, conceptos))) return licitacion;
  return {
    ...licitacion,
    conceptos: conceptos.map((c) => ({
      ...c,
      clave: c.clave.trim().toUpperCase(),
      descripcion: c.descripcion.trim(),
    })),
  };
}

/**
 * Envía el catálogo. Sin ronda abierta, abre la siguiente con una propuesta sin
 * responder para cada activo (la ronda 1, con los invitados) e invita a los
 * elegidos que estén entre ellos; con la ronda abierta solo invita a los que aún
 * no tienen su invitación. Los ids fuera de la ronda se ignoran; si nadie queda
 * por invitar, devuelve la licitación igual.
 */
export function conInvitaciones(
  licitacion: Licitacion,
  proveedorIds: readonly string[],
  canal: CanalAviso,
  fecha: FechaISO,
  hora: string,
): Licitacion {
  if (errorInvitaciones(licitacion) !== undefined) return licitacion;
  const pendientes = new Set(pendientesDeInvitar(licitacion));
  const elegidos = [...new Set(proveedorIds)].filter((id) => pendientes.has(id));
  if (elegidos.length === 0) return licitacion;
  const abierta = rondaAbierta(licitacion);
  const ronda = abierta ? abierta.numero : licitacion.rondas.length + 1;
  const invitaciones: InvitacionLicitacion[] = [
    ...licitacion.invitaciones,
    ...elegidos.map((proveedorId) => ({
      proveedorId,
      canal,
      enviadaEl: fecha,
      hora,
      ronda,
    })),
  ];
  if (abierta) return { ...licitacion, invitaciones };
  const nueva: RondaLicitacion = {
    numero: ronda,
    fecha,
    estado: "ABIERTA",
    propuestas: participantesDeEnvio(licitacion).map((proveedorId) => ({
      proveedorId,
      respondio: false,
    })),
  };
  return { ...licitacion, invitaciones, rondas: [...licitacion.rondas, nueva] };
}

/**
 * Guarda (o corrige) la respuesta de un proveedor en la ronda abierta, con su
 * total calculado; si no es válida devuelve la licitación igual.
 */
export function conRespuesta(
  licitacion: Licitacion,
  proveedorId: string,
  precios: readonly PrecioConcepto[],
  capturadaPor: CapturaRespuesta,
  fecha: FechaISO,
): Licitacion {
  if (!respuestaSinErrores(erroresRespuesta(licitacion, proveedorId, precios))) {
    return licitacion;
  }
  const abierta = rondaAbierta(licitacion);
  if (!abierta) return licitacion;
  const ordenados: PrecioConcepto[] = licitacion.conceptos.flatMap((c) => {
    const precio = precios.find((p) => p.conceptoId === c.id);
    return precio ? [{ conceptoId: c.id, precioUnitario: precio.precioUnitario }] : [];
  });
  const propuesta: PropuestaRonda = {
    proveedorId,
    respondio: true,
    monto: montoDePrecios(licitacion.conceptos, ordenados),
    precios: ordenados,
    capturadaPor,
    respondidaEl: fecha,
  };
  const ronda: RondaLicitacion = {
    ...abierta,
    propuestas: abierta.propuestas.map((p) =>
      p.proveedorId === proveedorId ? propuesta : p,
    ),
  };
  return {
    ...licitacion,
    rondas: licitacion.rondas.map((r) => (r.numero === ronda.numero ? ronda : r)),
  };
}

/** Cierra la ronda abierta; sin respuestas devuelve la licitación igual. */
export function conRondaCerrada(licitacion: Licitacion): Licitacion {
  if (errorCierreRonda(licitacion) !== undefined) return licitacion;
  return {
    ...licitacion,
    rondas: licitacion.rondas.map((r) =>
      r.estado === "ABIERTA" ? { ...r, estado: "CERRADA" } : r,
    ),
  };
}

/**
 * Contrato de obra que nace al adjudicar una licitación con catálogo: los
 * conceptos con el PU del ganador en la última ronda cerrada. `undefined` si el
 * ganador no tiene precio para cada concepto.
 */
export function contratoDeAdjudicacion(
  licitacion: Licitacion,
  proveedor: Pick<Proveedor, "id" | "nombre">,
  contratosDelTerreno: readonly ContratoObra[],
  fechas: FechasContrato,
): ContratoObra | undefined {
  const ultima = ultimaRondaCerrada(licitacion);
  if (!ultima || !tieneCatalogo(licitacion)) return undefined;
  if (!preciosCompletos(licitacion, ultima, proveedor.id)) return undefined;
  const precios = preciosDe(ultima, proveedor.id);
  const numero = String(contratosDelTerreno.length + 1).padStart(2, "0");
  const id = `${licitacion.terrenoId}-co-${numero}`;
  return {
    id,
    folio: `CO-${licitacion.folio.split("-")[1]}-${numero}`,
    terrenoId: licitacion.terrenoId,
    partida: licitacion.partida,
    contratista: proveedor.nombre,
    proveedorId: proveedor.id,
    conceptos: licitacion.conceptos.map((c, i) => ({
      id: `${id}-c${i + 1}`,
      clave: c.clave,
      descripcion: c.descripcion,
      unidad: c.unidad,
      volumenContratado: c.volumen,
      precioUnitario: precios.find((p) => p.conceptoId === c.id)?.precioUnitario ?? 0,
    })),
    inicioPlan: fechas.inicioPlan,
    finPlan: fechas.finPlan,
    anticipoPct: ANTICIPO_PCT,
    fondoGarantiaPct: FONDO_GARANTIA_PCT,
  };
}
