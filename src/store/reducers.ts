import {
  siguienteFolio,
  transicionar,
  ETIQUETA_ETAPA_PROSPECTO,
  ETAPAS_TERRENO,
  reglaEfectiva,
  siguienteEtapaProspecto,
  type CambioPropuesto,
  type Contrato,
  type Cotizacion,
  type EstadoCambio,
  type EtapaTerreno,
  type EventoSync,
  type ExcepcionPrecio,
  type FechaISO,
  type EstatusMantenimiento,
  type Foto,
  type IdIntegracion,
  type Local,
  type Mantenimiento,
  type Prospecto,
  type ReglaActualizacion,
  type Terreno,
  type ContratoObra,
  type ActividadCronograma,
  type CorteSemanal,
  type EntradaCorte,
  type PagoObra,
  type EntradaRonda,
  type Licitacion,
  conLicitacionAdjudicada,
  conProveedorDescartado,
  conRondaRegistrada,
  corteSinErrores,
  erroresCorte,
  firmarCorte,
  resolverCorte,
} from "@/domain";

/** Registro de un cambio hecho en vivo sobre un local (mínimo, regla). */
export interface EntradaBitacora {
  fecha: FechaISO;
  autor: string;
  titulo: string;
  detalle: string;
}

/** Campos del local que la demo puede editar en vivo (mínimo, lista y regla) y su bitácora. */
export type AjusteLocal = Partial<
  Pick<Local, "precioMinimo" | "precioVigente" | "regla" | "historial">
> & { bitacora?: EntradaBitacora[] };

export interface CotizacionesState {
  cotizaciones: Cotizacion[];
}

export interface AprobacionesState {
  excepciones: ExcepcionPrecio[];
  cambiosAnuales: CambioPropuesto[];
}

export interface CobranzaState {
  /** Historial de seguimiento por factura (el más reciente al final). */
  seguimientos: Record<string, string[]>;
  /** Facturas con aviso enviado. */
  avisados: string[];
}

export interface IntegracionesState {
  /** Último sync hecho en la demo por integración; la ausente conserva el del seed. */
  sincronizaciones: Partial<Record<IdIntegracion, string>>;
  /** Log de sincronizaciones, del más antiguo al más reciente. */
  eventos: EventoSync[];
}

export interface ProspectosState {
  prospectos: Prospecto[];
}

export interface ContratosState {
  /** Contratos nacidos en la demo (de una cotización); los del seed no cambian. */
  nuevos: Contrato[];
}

/** Contratos de obra y cronograma de los proyectos (parten del seed). */
export interface ObraState {
  contratos: ContratoObra[];
  cronograma: ActividadCronograma[];
  cortes: CorteSemanal[];
  pagos: PagoObra[];
  licitaciones: Licitacion[];
}

export interface TerrenosState {
  terrenos: Terreno[];
}

export interface MantenimientosState {
  mantenimientos: Mantenimiento[];
}

export interface ReglasDefaultState {
  /** Regla de actualización por default editada en la demo, por id de plaza. */
  porPlaza: Record<string, ReglaActualizacion>;
}

export interface MetasState {
  /** Meta de cumplimiento del plan de ingresos editada en la demo, en %, por id de plaza. */
  porPlaza: Record<string, number>;
}

export interface LocalesState {
  ajustes: Record<string, AjusteLocal>;
}

// --- cotizaciones ---------------------------------------------------------

export function agregarCotizacion(
  estado: CotizacionesState,
  cotizacion: Cotizacion,
): CotizacionesState {
  if (estado.cotizaciones.some((c) => c.id === cotizacion.id)) return estado;
  return { cotizaciones: [...estado.cotizaciones, cotizacion] };
}

export function actualizarCotizacion(
  estado: CotizacionesState,
  id: string,
  parche: Partial<Omit<Cotizacion, "id">>,
): CotizacionesState {
  return {
    cotizaciones: estado.cotizaciones.map((c) => (c.id === id ? { ...c, ...parche } : c)),
  };
}

// --- aprobaciones ---------------------------------------------------------

/** Estados en que la excepción sigue abierta: espera a Dirección o a la PMO. */
const ESTADOS_ABIERTOS: readonly ExcepcionPrecio["estado"][] = [
  "PENDIENTE",
  "AUTORIZADA_DIRECCION",
];

/** Crea una excepción pendiente; una cotización solo tiene una abierta a la vez. */
export function solicitarExcepcion(
  estado: AprobacionesState,
  cotizacion: Cotizacion,
  local: Pick<Local, "precioMinimo">,
  solicitadaPor: string,
  motivo: string,
  hoy: FechaISO,
): AprobacionesState {
  const abierta = estado.excepciones.some(
    (e) => e.cotizacionId === cotizacion.id && ESTADOS_ABIERTOS.includes(e.estado),
  );
  if (abierta) return estado;
  const nueva: ExcepcionPrecio = {
    id: `exc-${cotizacion.id}-${estado.excepciones.length + 1}`,
    cotizacionId: cotizacion.id,
    localId: cotizacion.localId,
    rentaSolicitada: cotizacion.rentaMensual,
    precioMinimo: local.precioMinimo,
    estado: "PENDIENTE",
    solicitadaPor,
    solicitadaEn: hoy,
    motivo,
  };
  return { ...estado, excepciones: [...estado.excepciones, nueva] };
}

/** Aplica `cambio` a la excepción `id` solo si está en el estado `desde`. */
function transicionarExcepcion(
  estado: AprobacionesState,
  id: string,
  desde: ExcepcionPrecio["estado"],
  cambio: Partial<ExcepcionPrecio>,
): AprobacionesState {
  return {
    ...estado,
    excepciones: estado.excepciones.map((e) =>
      e.id === id && e.estado === desde ? { ...e, ...cambio } : e,
    ),
  };
}

/** Dirección autoriza una excepción pendiente; el comentario es opcional. */
export function autorizarExcepcion(
  estado: AprobacionesState,
  id: string,
  autorizadaPor: string,
  hoy: FechaISO,
  comentario?: string,
): AprobacionesState {
  return transicionarExcepcion(estado, id, "PENDIENTE", {
    estado: "AUTORIZADA_DIRECCION",
    autorizadaPor,
    autorizadaEn: hoy,
    comentarioDireccion: comentario?.trim() || undefined,
  });
}

/** La PMO aplica una excepción autorizada: desde aquí el candado de precio pasa. */
export function aplicarExcepcion(
  estado: AprobacionesState,
  id: string,
  aplicadaPor: string,
  hoy: FechaISO,
  comentario?: string,
): AprobacionesState {
  return transicionarExcepcion(estado, id, "AUTORIZADA_DIRECCION", {
    estado: "APLICADA",
    aplicadaPor,
    aplicadaEn: hoy,
    comentarioPmo: comentario?.trim() || undefined,
  });
}

/**
 * Rechaza una excepción abierta. Dirección rechaza las pendientes y la PMO las
 * autorizadas; el comentario es obligatorio y queda en el campo de quien rechaza.
 */
export function rechazarExcepcion(
  estado: AprobacionesState,
  id: string,
  rechazadaPor: string,
  hoy: FechaISO,
  comentario: string,
): AprobacionesState {
  const texto = comentario.trim();
  if (!texto) throw new Error("Rechazar una excepción requiere comentario");
  const actual = estado.excepciones.find((e) => e.id === id);
  if (actual?.estado === "PENDIENTE") {
    return transicionarExcepcion(estado, id, "PENDIENTE", {
      estado: "RECHAZADA",
      rechazadaPor,
      rechazadaEn: hoy,
      comentarioDireccion: texto,
    });
  }
  return transicionarExcepcion(estado, id, "AUTORIZADA_DIRECCION", {
    estado: "RECHAZADA",
    rechazadaPor,
    rechazadaEn: hoy,
    comentarioPmo: texto,
  });
}

/** Aprueba o rechaza cambios de la bandeja anual; solo mueve los pendientes. */
export function resolverCambiosAnuales(
  estado: AprobacionesState,
  localIds: readonly string[],
  año: number,
  resolucion: Exclude<EstadoCambio, "PENDIENTE">,
): AprobacionesState {
  const objetivo = new Set(localIds);
  return {
    ...estado,
    cambiosAnuales: estado.cambiosAnuales.map((c) =>
      c.año === año && objetivo.has(c.localId) && c.estado === "PENDIENTE"
        ? { ...c, estado: resolucion }
        : c,
    ),
  };
}

/** Excepciones que esperan la decisión de Dirección. */
export function contarPorAutorizar(estado: AprobacionesState): number {
  return estado.excepciones.filter((e) => e.estado === "PENDIENTE").length;
}

/** Excepciones autorizadas que esperan a la PMO. */
export function contarPorAplicar(estado: AprobacionesState): number {
  return estado.excepciones.filter((e) => e.estado === "AUTORIZADA_DIRECCION").length;
}

export function contarCambiosPendientes(estado: AprobacionesState): number {
  return estado.cambiosAnuales.filter((c) => c.estado === "PENDIENTE").length;
}

// --- cobranza -------------------------------------------------------------

export function registrarSeguimiento(
  estado: CobranzaState,
  facturaId: string,
  texto: string,
): CobranzaState {
  return {
    ...estado,
    seguimientos: {
      ...estado.seguimientos,
      [facturaId]: [...(estado.seguimientos[facturaId] ?? []), texto],
    },
  };
}

export function registrarAvisos(
  estado: CobranzaState,
  facturaIds: readonly string[],
  texto: string,
): CobranzaState {
  const avisados = Array.from(new Set([...estado.avisados, ...facturaIds]));
  const seguimientos = { ...estado.seguimientos };
  for (const id of facturaIds) seguimientos[id] = [...(seguimientos[id] ?? []), texto];
  return { seguimientos, avisados };
}

// --- integraciones --------------------------------------------------------

/** Anota una sincronización: fija el último sync de la integración y suma al log. */
export function registrarSync(
  estado: IntegracionesState,
  evento: Omit<EventoSync, "id">,
): IntegracionesState {
  return {
    sincronizaciones: {
      ...estado.sincronizaciones,
      [evento.integracionId]: evento.fecha,
    },
    eventos: [...estado.eventos, { ...evento, id: `sync-${estado.eventos.length + 1}` }],
  };
}

// --- prospectos -----------------------------------------------------------

export function registrarProspecto(
  estado: ProspectosState,
  prospecto: Prospecto,
): ProspectosState {
  if (estado.prospectos.some((p) => p.id === prospecto.id)) return estado;
  return { prospectos: [...estado.prospectos, prospecto] };
}

function moverProspecto(
  estado: ProspectosState,
  id: string,
  hoy: FechaISO,
  etapaDe: (actual: Prospecto["etapa"]) => Prospecto["etapa"] | null,
  titulo: (etapa: Prospecto["etapa"]) => string,
): ProspectosState {
  return {
    prospectos: estado.prospectos.map((p) => {
      const etapa = p.id === id ? etapaDe(p.etapa) : null;
      if (!etapa) return p;
      const hecho = {
        id: `act-${p.actividad.length + 1}`,
        titulo: titulo(etapa),
        fecha: hoy,
      };
      return { ...p, etapa, actividad: [...p.actividad, hecho] };
    }),
  };
}

/** Pasa un prospecto vivo a la siguiente etapa del embudo y lo anota en su actividad. */
export function avanzarProspecto(
  estado: ProspectosState,
  id: string,
  hoy: FechaISO,
): ProspectosState {
  return moverProspecto(
    estado,
    id,
    hoy,
    siguienteEtapaProspecto,
    (etapa) => `Avanzó a ${ETIQUETA_ETAPA_PROSPECTO[etapa]}`,
  );
}

/** Marca como perdido a un prospecto vivo. */
export function descartarProspecto(
  estado: ProspectosState,
  id: string,
  hoy: FechaISO,
): ProspectosState {
  return moverProspecto(
    estado,
    id,
    hoy,
    (actual) => (siguienteEtapaProspecto(actual) ? "PERDIDO" : null),
    () => "Prospecto descartado",
  );
}

// --- contratos ------------------------------------------------------------

export function agregarContrato(
  estado: ContratosState,
  contrato: Contrato,
): ContratosState {
  if (estado.nuevos.some((c) => c.id === contrato.id)) return estado;
  return { nuevos: [...estado.nuevos, contrato] };
}

function transitarContrato(
  estado: ContratosState,
  id: string,
  desde: Contrato["estado"],
  hacia: Contrato["estado"],
): ContratosState {
  return {
    nuevos: estado.nuevos.map((c) =>
      c.id === id && c.estado === desde ? { ...c, estado: hacia } : c,
    ),
  };
}

/** Un borrador pasa a firma. */
export function enviarAFirma(estado: ContratosState, id: string): ContratosState {
  return transitarContrato(estado, id, "BORRADOR", "EN_FIRMA");
}

/** Un contrato en firma queda vigente. */
export function registrarFirma(estado: ContratosState, id: string): ContratosState {
  return transitarContrato(estado, id, "EN_FIRMA", "VIGENTE");
}

// --- terrenos -------------------------------------------------------------

/** Mueve un terreno a otra etapa: el avance arranca en 0 (100 si ya abrió). */
export function moverEtapaTerreno(
  estado: TerrenosState,
  id: string,
  etapa: EtapaTerreno,
): TerrenosState {
  if (!ETAPAS_TERRENO.includes(etapa)) return estado;
  return {
    terrenos: estado.terrenos.map((t) =>
      t.id === id && t.etapa !== etapa
        ? { ...t, etapa, avancePct: etapa === "ABIERTO" ? 100 : 0 }
        : t,
    ),
  };
}

/** Fija el avance (0-100) de la etapa actual. */
export function actualizarAvanceTerreno(
  estado: TerrenosState,
  id: string,
  avancePct: number,
): TerrenosState {
  const avance = Math.min(100, Math.max(0, Math.round(avancePct)));
  return {
    terrenos: estado.terrenos.map((t) => (t.id === id ? { ...t, avancePct: avance } : t)),
  };
}

// --- cortes de obra -------------------------------------------------------

/**
 * Registra y firma un corte semanal. Una captura inválida (volumen que excede lo
 * contratado, semana repetida) no cambia nada: el diálogo ya la bloquea.
 */
export function registrarCorte(
  estado: ObraState,
  entrada: EntradaCorte,
  autor: string,
  hoy: FechaISO,
  evidencia: Foto[],
): ObraState {
  const contrato = estado.contratos.find((c) => c.id === entrada.contratoObraId);
  if (!contrato || !corteSinErrores(erroresCorte(contrato, estado.cortes, entrada))) {
    return estado;
  }
  const id = `cor-${String(estado.cortes.length + 1).padStart(4, "0")}`;
  return {
    ...estado,
    cortes: [...estado.cortes, firmarCorte(id, entrada, autor, hoy, evidencia)],
  };
}

/** La PMO valida o rechaza (con comentario) un corte firmado. */
export function resolverCorteObra(
  estado: ObraState,
  id: string,
  resolucion: "VALIDADO_PMO" | "RECHAZADO",
  autor: string,
  hoy: FechaISO,
  comentario?: string,
): ObraState {
  return {
    ...estado,
    cortes: estado.cortes.map((c) =>
      c.id === id ? resolverCorte(c, resolucion, autor, hoy, comentario) : c,
    ),
  };
}

/** Aplica una transición de dominio a una licitación; las demás quedan igual. */
function actualizarLicitacion(
  estado: ObraState,
  id: string,
  transicion: (licitacion: Licitacion) => Licitacion,
): ObraState {
  return {
    ...estado,
    licitaciones: estado.licitaciones.map((l) => (l.id === id ? transicion(l) : l)),
  };
}

/** La PMO captura una ronda de propuestas de una licitación en curso. */
export function registrarRonda(
  estado: ObraState,
  id: string,
  entrada: EntradaRonda,
  hoy: FechaISO,
): ObraState {
  return actualizarLicitacion(estado, id, (l) => conRondaRegistrada(l, entrada, hoy));
}

/** La PMO saca a un proveedor de la competencia; el motivo es obligatorio. */
export function descartarProveedor(
  estado: ObraState,
  id: string,
  proveedorId: string,
  motivo: string,
): ObraState {
  return actualizarLicitacion(estado, id, (l) =>
    conProveedorDescartado(l, proveedorId, motivo),
  );
}

/** La PMO adjudica la licitación al ganador de la última ronda, con motivo. */
export function adjudicarLicitacion(
  estado: ObraState,
  id: string,
  ganadorId: string,
  motivo: string,
  autor: string,
  hoy: FechaISO,
): ObraState {
  return actualizarLicitacion(estado, id, (l) =>
    conLicitacionAdjudicada(l, ganadorId, motivo, autor, hoy),
  );
}

// --- mantenimientos -------------------------------------------------------

/** Lo que captura el diálogo de alta: el resto lo fija el reducer (nace programado). */
export type NuevoMantenimiento = Omit<
  Mantenimiento,
  "id" | "folio" | "estatus" | "evidencia" | "fechaInicio" | "fechaFin" | "costoReal"
>;

/** Da de alta un mantenimiento programado con el siguiente folio libre. */
export function agregarMantenimiento(
  estado: MantenimientosState,
  nuevo: NuevoMantenimiento,
  hoy: FechaISO,
): MantenimientosState {
  const folio = siguienteFolio(
    estado.mantenimientos.map((m) => m.folio),
    hoy,
  );
  const consecutivo = folio.split("-")[2];
  const mantenimiento: Mantenimiento = {
    ...nuevo,
    id: `mnt-${consecutivo}`,
    folio,
    estatus: "PROGRAMADO",
    evidencia: [],
  };
  return { mantenimientos: [...estado.mantenimientos, mantenimiento] };
}

/**
 * Mueve un mantenimiento a otro estatus según el flujo del dominio. Si la
 * transición no es válida (o falta el costo real al finalizar) deja el estado igual.
 */
export function transicionarMantenimiento(
  estado: MantenimientosState,
  id: string,
  destino: EstatusMantenimiento,
  datos: { hoy: FechaISO; costoReal?: number; evidencia?: readonly Foto[] },
): MantenimientosState {
  const actual = estado.mantenimientos.find((m) => m.id === id);
  const siguiente = actual && transicionar(actual, destino, datos);
  if (!siguiente) return estado;
  return {
    mantenimientos: estado.mantenimientos.map((m) => (m.id === id ? siguiente : m)),
  };
}

// --- reglas por default ---------------------------------------------------

export function establecerReglaDefault(
  estado: ReglasDefaultState,
  plazaId: string,
  regla: ReglaActualizacion,
): ReglasDefaultState {
  return { porPlaza: { ...estado.porPlaza, [plazaId]: regla } };
}

/** Aplica la regla por default editada en la demo sobre una plaza del repositorio. */
export function aplicarReglaDefault<
  T extends { id: string; reglaDefault?: ReglaActualizacion },
>(plaza: T, estado: ReglasDefaultState): T {
  const regla = estado.porPlaza[plaza.id];
  return regla ? { ...plaza, reglaDefault: regla } : plaza;
}

/**
 * Lleva a un local que hereda el default de su plaza la versión editada en la
 * demo; `reglaBase` es el default de la plaza en el repositorio.
 */
export function aplicarReglaHeredada(
  local: Local,
  reglaBase: ReglaActualizacion | undefined,
  estado: ReglasDefaultState,
): Local {
  const editada = estado.porPlaza[local.plazaId];
  if (!editada) return local;
  const regla = reglaEfectiva(local.regla, reglaBase, editada);
  return regla === local.regla ? local : { ...local, regla };
}

// --- meta de ingresos -----------------------------------------------------

export function establecerMeta(
  estado: MetasState,
  plazaId: string,
  metaPct: number,
): MetasState {
  return { porPlaza: { ...estado.porPlaza, [plazaId]: metaPct } };
}

/** Aplica la meta editada en la demo sobre una plaza del repositorio. */
export function aplicarMeta<T extends { id: string; metaCumplimientoPct: number }>(
  plaza: T,
  estado: MetasState,
): T {
  const meta = estado.porPlaza[plaza.id];
  return meta === undefined ? plaza : { ...plaza, metaCumplimientoPct: meta };
}

// --- locales --------------------------------------------------------------

/** Anota un hecho en la bitácora del local sin tocar el resto de sus ajustes. */
export function registrarBitacoraLocal(
  estado: LocalesState,
  localId: string,
  entrada: EntradaBitacora,
): LocalesState {
  const actual = estado.ajustes[localId];
  return ajustarLocal(estado, localId, {
    bitacora: [...(actual?.bitacora ?? []), entrada],
  });
}

export function ajustarLocal(
  estado: LocalesState,
  localId: string,
  ajuste: AjusteLocal,
): LocalesState {
  return {
    ajustes: { ...estado.ajustes, [localId]: { ...estado.ajustes[localId], ...ajuste } },
  };
}

/** Aplica los ajustes de la demo sobre un local del repositorio. */
export function aplicarAjuste(local: Local, ajuste: AjusteLocal | undefined): Local {
  if (!ajuste) return local;
  const {
    precioMinimo = local.precioMinimo,
    precioVigente = local.precioVigente,
    regla = local.regla,
    historial = local.historial,
  } = ajuste;
  return { ...local, precioMinimo, precioVigente, regla, historial };
}
