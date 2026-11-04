import {
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
  type IdIntegracion,
  type Local,
  type Prospecto,
  type ReglaActualizacion,
  type Terreno,
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

export interface TerrenosState {
  terrenos: Terreno[];
}

export interface ReglasDefaultState {
  /** Regla de actualización por default editada en la demo, por id de plaza. */
  porPlaza: Record<string, ReglaActualizacion>;
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

/** Crea una excepción pendiente; una cotización solo tiene una abierta a la vez. */
export function solicitarExcepcion(
  estado: AprobacionesState,
  cotizacion: Cotizacion,
  local: Pick<Local, "precioMinimo">,
  solicitadaPor: string,
  motivo: string,
): AprobacionesState {
  const abierta = estado.excepciones.some(
    (e) => e.cotizacionId === cotizacion.id && e.estado === "PENDIENTE",
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
    motivo,
  };
  return { ...estado, excepciones: [...estado.excepciones, nueva] };
}

/** Resuelve una excepción pendiente. Rechazar exige comentario. */
export function resolverExcepcion(
  estado: AprobacionesState,
  id: string,
  resolucion: "APROBADA" | "RECHAZADA",
  resueltaPor: string,
  comentario?: string,
): AprobacionesState {
  if (resolucion === "RECHAZADA" && !comentario?.trim()) {
    throw new Error("Rechazar una excepción requiere comentario");
  }
  return {
    ...estado,
    excepciones: estado.excepciones.map((e) =>
      e.id === id && e.estado === "PENDIENTE"
        ? { ...e, estado: resolucion, resueltaPor, comentario: comentario?.trim() }
        : e,
    ),
  };
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

export function contarExcepcionesPendientes(estado: AprobacionesState): number {
  return estado.excepciones.filter((e) => e.estado === "PENDIENTE").length;
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

// --- locales --------------------------------------------------------------

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
