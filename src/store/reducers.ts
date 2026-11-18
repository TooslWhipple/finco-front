import {
  calcularComisiones,
  cotizacionRequirioExcepcion,
  mesesCobrados,
  type Comision,
  type EsquemaComisiones,
  esCalificacionCaso,
  puedeEscalar,
  siguienteFolioCaso,
  validarTransicionCaso,
  TEXTO_BITACORA_CASO,
  type CasoServicio,
  type EstatusCaso,
  type Usuario,
  aplicarParcheConOferta,
  consumoPresupuesto,
  crearOferta,
  excedenteSobregiro,
  requiereAutorizacion,
  resolverSobregiro,
  siguienteFolio,
  solicitarSobregiro,
  transicionar,
  ETIQUETA_ETAPA_PROSPECTO,
  ETIQUETA_TIPO_CONTACTO,
  expedienteCompleto,
  prospectoActivo,
  ETAPAS_TERRENO,
  reglaEfectiva,
  siguienteEtapaProspecto,
  type AperturaLocal,
  type CambioPropuesto,
  type ComplementoPago,
  type Contrato,
  type Cotizacion,
  type EstadoCambio,
  type EtapaTerreno,
  type EntregaAviso,
  type EnvioAviso,
  type EventoSync,
  type Factura,
  type ExcepcionPrecio,
  type FechaISO,
  type Liberacion,
  type EstatusMantenimiento,
  type Foto,
  type IdIntegracion,
  type Local,
  type FacturaSat,
  type Mantenimiento,
  type PresupuestoMantenimiento,
  type ProgramacionAvisos,
  type ProgramacionEmision,
  type PlantillaAviso,
  type Prospecto,
  type TipoContactoProspecto,
  type TipoDocumentoProspecto,
  type ReglaActualizacion,
  type ReglaRecargo,
  type Terreno,
  type ContratoObra,
  type ActividadCronograma,
  type CorteSemanal,
  type EntradaCorte,
  type EntradaEstimacion,
  type EstimacionObra,
  type PagoObra,
  type EntradaRonda,
  type CanalAviso,
  type CapturaRespuesta,
  type ConceptoLicitacion,
  type FechasContrato,
  type Licitacion,
  type PrecioConcepto,
  conCatalogo,
  conInvitaciones,
  conRespuesta,
  conRondaCerrada,
  contratoDeAdjudicacion,
  errorAdjudicacion,
  errorFechasContrato,
  tieneCatalogo,
  conLicitacionAdjudicada,
  conProveedorDescartado,
  conRondaRegistrada,
  corteSinErrores,
  erroresCorte,
  erroresEstimacion,
  estimacionSinErrores,
  firmarCorte,
  firmarEstimacion,
  pagoDeEstimacion,
  resolverCorte,
  resolverEstimacion,
  rfcEnUso,
  type Campana,
  type Proveedor,
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
> & {
  bitacora?: EntradaBitacora[];
  /** Estatus y fecha de liberación fijados al terminar el contrato en la demo. */
  estatus?: Local["estatus"];
  libreDesde?: FechaISO;
  /** El local ya no tiene locatario (se liberó). */
  sinLocatario?: boolean;
};

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
  plantillas: PlantillaAviso[];
  programacion: ProgramacionAvisos;
  /** Bitácora de envíos simulados, del más antiguo al más reciente. */
  envios: EnvioAviso[];
  /** Facturas de renta emitidas en la demo (origen `EMISION`). */
  emitidas: Factura[];
  /** Recargos generados en la demo. */
  recargos: Factura[];
  /** Complementos de pago registrados en la demo, por renta pagada. */
  pagos: Record<string, ComplementoPago[]>;
  programacionEmision: ProgramacionEmision;
  /** Regla vigente para los próximos recargos; editarla no toca los ya generados. */
  reglaRecargo: ReglaRecargo;
}

/** Lo que produce una corrida de emisión, precalculado en el dominio. */
export interface EmisionFacturas {
  facturas: readonly Factura[];
  recargos: readonly Factura[];
  /** Avisos de factura emitida (no marcan `avisados`). */
  entregas: readonly EntregaAviso[];
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
  /** Contratos terminados en la demo (también los del seed), por id de contrato. */
  terminaciones: Record<string, { fecha: FechaISO; motivo: string }>;
  /** Aperturas registradas en la demo, por id de contrato. */
  aperturas: Record<string, AperturaLocal>;
}

/** Contratos de obra y cronograma de los proyectos (parten del seed). */
export interface ObraState {
  contratos: ContratoObra[];
  cronograma: ActividadCronograma[];
  cortes: CorteSemanal[];
  pagos: PagoObra[];
  estimaciones: EstimacionObra[];
  licitaciones: Licitacion[];
}

export interface TerrenosState {
  terrenos: Terreno[];
}

export interface MantenimientosState {
  mantenimientos: Mantenimiento[];
  presupuestos: PresupuestoMantenimiento[];
  facturasSat: FacturaSat[];
}

export interface ProveedoresState {
  /** Padrón único de proveedores de mantenimiento y obra. */
  padron: Proveedor[];
}

export interface CampanasState {
  /** Catálogo de campañas comerciales. */
  campanas: Campana[];
}

export interface CasosState {
  /** Casos de servicio a clientes. */
  casos: CasoServicio[];
}

export interface ComisionesState {
  /** Esquema vigente: solo afecta a las comisiones que se generen después. */
  esquema: EsquemaComisiones;
  /** Comisiones generadas (foto fija al firmar cada contrato). */
  comisiones: Comision[];
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
  fecha: FechaISO,
  hora: string,
): CotizacionesState {
  if (estado.cotizaciones.some((c) => c.id === cotizacion.id)) return estado;
  // Crear la cotización registra la oferta 1, a nombre de su vendedor.
  const ofertas =
    cotizacion.ofertas.length > 0
      ? cotizacion.ofertas
      : [
          crearOferta(
            `${cotizacion.id}-of1`,
            cotizacion,
            cotizacion.vendedorId,
            fecha,
            hora,
          ),
        ];
  return { cotizaciones: [...estado.cotizaciones, { ...cotizacion, ofertas }] };
}

export function actualizarCotizacion(
  estado: CotizacionesState,
  id: string,
  parche: Partial<Omit<Cotizacion, "id">>,
  vendedorId: string,
  fecha: FechaISO,
  hora: string,
): CotizacionesState {
  return {
    cotizaciones: estado.cotizaciones.map((c) =>
      c.id === id ? aplicarParcheConOferta(c, parche, vendedorId, fecha, hora) : c,
    ),
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

/**
 * Registra avisos simulados: los suma a la bitácora, marca las facturas como
 * avisadas y deja la constancia en su seguimiento.
 */
export function registrarAvisos(
  estado: CobranzaState,
  entregas: readonly EntregaAviso[],
  texto: string,
  fecha: FechaISO,
  hora: string,
  origen: EnvioAviso["origen"],
): CobranzaState {
  const avisados = Array.from(
    new Set([...estado.avisados, ...entregas.map((e) => e.facturaId)]),
  );
  const seguimientos = { ...estado.seguimientos };
  for (const e of entregas) {
    seguimientos[e.facturaId] = [...(seguimientos[e.facturaId] ?? []), texto];
  }
  const envios = anexarEnvios(estado.envios, entregas, fecha, hora, origen);
  return { ...estado, seguimientos, avisados, envios };
}

/** Suma a la bitácora un envío simulado por entrega, con ids consecutivos. */
function anexarEnvios(
  envios: readonly EnvioAviso[],
  entregas: readonly EntregaAviso[],
  fecha: FechaISO,
  hora: string,
  origen: EnvioAviso["origen"],
): EnvioAviso[] {
  return [
    ...envios,
    ...entregas.map((e, i) => ({
      id: `env-${envios.length + i + 1}`,
      facturaId: e.facturaId,
      plantillaId: e.plantillaId,
      canal: e.canal,
      enviadoEl: fecha,
      hora,
      origen,
    })),
  ];
}

/** Agrega las facturas cuyo id aún no está en la lista. */
function sinRepetir(actuales: readonly Factura[], nuevas: readonly Factura[]): Factura[] {
  const ids = new Set(actuales.map((f) => f.id));
  const agregadas = nuevas.filter((f) => {
    if (ids.has(f.id)) return false;
    ids.add(f.id);
    return true;
  });
  return [...actuales, ...agregadas];
}

/**
 * Guarda una corrida de emisión: las facturas emitidas y los recargos que no
 * existían, y un envío simulado del aviso de cada factura emitida. Los avisos de
 * emisión no marcan `avisados` (ese marcador es del aviso de atraso).
 */
export function emitirFacturacion(
  estado: CobranzaState,
  emision: EmisionFacturas,
  fecha: FechaISO,
  hora: string,
  origen: EnvioAviso["origen"],
): CobranzaState {
  const yaEmitidas = new Set(estado.emitidas.map((f) => f.id));
  const entregas = emision.entregas.filter((e) => !yaEmitidas.has(e.facturaId));
  return {
    ...estado,
    emitidas: sinRepetir(estado.emitidas, emision.facturas),
    recargos: sinRepetir(estado.recargos, emision.recargos),
    envios: anexarEnvios(estado.envios, entregas, fecha, hora, origen),
  };
}

/** Guarda los recargos que aún no existían. */
export function generarRecargos(
  estado: CobranzaState,
  recargos: readonly Factura[],
): CobranzaState {
  return { ...estado, recargos: sinRepetir(estado.recargos, recargos) };
}

/**
 * Registra el pago total de una renta con su complemento. Solo hay pago total:
 * una renta ya pagada en la demo no admite otro.
 */
export function registrarPago(
  estado: CobranzaState,
  facturaId: string,
  complemento: ComplementoPago,
): CobranzaState {
  if (estado.pagos[facturaId]?.length) return estado;
  return { ...estado, pagos: { ...estado.pagos, [facturaId]: [complemento] } };
}

export function guardarProgramacionEmision(
  estado: CobranzaState,
  programacionEmision: ProgramacionEmision,
): CobranzaState {
  return { ...estado, programacionEmision };
}

export function editarReglaRecargo(
  estado: CobranzaState,
  reglaRecargo: ReglaRecargo,
): CobranzaState {
  return { ...estado, reglaRecargo };
}

/** Edita el texto de una plantilla; el asunto solo aplica a las de correo. */
export function editarPlantilla(
  estado: CobranzaState,
  id: string,
  parche: { asunto?: string; cuerpo: string },
): CobranzaState {
  return {
    ...estado,
    plantillas: estado.plantillas.map((p) =>
      p.id === id
        ? {
            ...p,
            cuerpo: parche.cuerpo,
            ...(p.canal === "CORREO" ? { asunto: parche.asunto } : {}),
          }
        : p,
    ),
  };
}

export function guardarProgramacion(
  estado: CobranzaState,
  programacion: ProgramacionAvisos,
): CobranzaState {
  return { ...estado, programacion };
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

/** Marca como perdido a un prospecto vivo y deja el motivo en su actividad. */
export function marcarProspectoPerdido(
  estado: ProspectosState,
  id: string,
  motivo: string,
  hoy: FechaISO,
): ProspectosState {
  return moverProspecto(
    estado,
    id,
    hoy,
    (actual) => (siguienteEtapaProspecto(actual) ? "PERDIDO" : null),
    () => `Descartado: ${motivo.trim()}`,
  );
}

/**
 * Gana un prospecto vivo al generarse el contrato de su cotización y lo anota
 * con el folio; los ya ganados o perdidos no cambian.
 */
export function ganarProspectoPorContrato(
  estado: ProspectosState,
  prospectoId: string,
  folio: string,
  fecha: FechaISO,
): ProspectosState {
  return moverProspecto(
    estado,
    prospectoId,
    fecha,
    (actual) => (siguienteEtapaProspecto(actual) ? "GANADO" : null),
    () => `Contrato ${folio} generado`,
  );
}

/** Anota un contacto con un prospecto vivo: reinicia sus días sin contacto. */
export function registrarContactoProspecto(
  estado: ProspectosState,
  id: string,
  contacto: { tipo: TipoContactoProspecto; nota: string },
  hoy: FechaISO,
): ProspectosState {
  const nota = contacto.nota.trim();
  return {
    prospectos: estado.prospectos.map((p) => {
      if (p.id !== id || !prospectoActivo(p)) return p;
      const etiqueta = ETIQUETA_TIPO_CONTACTO[contacto.tipo];
      const hecho = {
        id: `act-${p.actividad.length + 1}`,
        titulo: nota ? `${etiqueta}: ${nota}` : etiqueta,
        fecha: hoy,
      };
      return { ...p, actividad: [...p.actividad, hecho] };
    }),
  };
}

/**
 * Marca (con la fecha de hoy) o desmarca un documento del expediente de un
 * prospecto vivo; no anota nada en la actividad.
 */
export function registrarDocumentoProspecto(
  estado: ProspectosState,
  id: string,
  tipo: TipoDocumentoProspecto,
  entregado: boolean,
  hoy: FechaISO,
): ProspectosState {
  return {
    prospectos: estado.prospectos.map((p) => {
      if (p.id !== id || !prospectoActivo(p)) return p;
      const documentos = { ...p.documentos };
      if (entregado) documentos[tipo] = hoy;
      else delete documentos[tipo];
      return { ...p, documentos };
    }),
  };
}

/**
 * Lleva el expediente del prospecto a la instantánea de sus cotizaciones aún
 * abiertas (BORRADOR o ENVIADA) para que el candado EXPEDIENTE lo refleje; las
 * que ya generaron contrato conservan la suya.
 */
export function recalcularExpedienteCotizaciones(
  estado: CotizacionesState,
  prospecto: Prospecto,
): CotizacionesState {
  const completo = expedienteCompleto(prospecto);
  return {
    cotizaciones: estado.cotizaciones.map((c) =>
      c.prospectoId === prospecto.id &&
      (c.estado === "BORRADOR" || c.estado === "ENVIADA") &&
      c.prospecto.documentosCompletos !== completo
        ? { ...c, prospecto: { ...c.prospecto, documentosCompletos: completo } }
        : c,
    ),
  };
}

// --- contratos ------------------------------------------------------------

export function agregarContrato(
  estado: ContratosState,
  contrato: Contrato,
): ContratosState {
  if (estado.nuevos.some((c) => c.id === contrato.id)) return estado;
  return { ...estado, nuevos: [...estado.nuevos, contrato] };
}

function transitarContrato(
  estado: ContratosState,
  id: string,
  desde: Contrato["estado"],
  hacia: Contrato["estado"],
): ContratosState {
  return {
    ...estado,
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

/** Aplica las terminaciones hechas en la demo: el contrato pasa a TERMINADO y su fin es la fecha de salida. */
export function aplicarTerminaciones(
  contratos: readonly Contrato[],
  terminaciones: ContratosState["terminaciones"],
): Contrato[] {
  return contratos.map((c) => {
    const t = terminaciones[c.id];
    return t ? { ...c, estado: "TERMINADO", fin: t.fecha } : c;
  });
}

/** Registra la apertura del local de un contrato; si ya hay una para ese contrato no hace nada. */
export function registrarApertura(
  estado: ContratosState,
  contratoId: string,
  apertura: AperturaLocal,
): ContratosState {
  if (estado.aperturas[contratoId]) return estado;
  return { ...estado, aperturas: { ...estado.aperturas, [contratoId]: apertura } };
}

/** Aplica las aperturas registradas en la demo; la que trae el contrato (semilla) gana. */
export function aplicarAperturas(
  contratos: readonly Contrato[],
  aperturas: ContratosState["aperturas"],
): Contrato[] {
  return contratos.map((c) => {
    if (c.apertura) return c;
    const a = aperturas[c.id];
    return a ? { ...c, apertura: a } : c;
  });
}

/**
 * Libera un local: termina el contrato, deja el local disponible, aplica el
 * repricing (lista, mínimo e historial) y anota la bitácora. Si el contrato ya
 * estaba terminado no hace nada.
 */
export function aplicarLiberacion(
  contratos: ContratosState,
  locales: LocalesState,
  local: Pick<Local, "historial">,
  liberacion: Liberacion,
  autor: string,
  formatearMoneda: (monto: number) => string,
): { contratos: ContratosState; locales: LocalesState } {
  if (contratos.terminaciones[liberacion.contratoId]) return { contratos, locales };
  const cambia = liberacion.registros.length > 0;
  const resumen = cambia
    ? `Lista ${formatearMoneda(liberacion.precioAnterior)} → ${formatearMoneda(liberacion.precioNuevo)} · mínimo ${formatearMoneda(liberacion.minimoAnterior)} → ${formatearMoneda(liberacion.minimoNuevo)} (regla ${liberacion.textoRegla}, ${liberacion.años.length} ${liberacion.años.length === 1 ? "año" : "años"})`
    : "Sin años por actualizar: los precios se conservan";
  const ajustado = ajustarLocal(locales, liberacion.localId, {
    estatus: "DISPONIBLE",
    libreDesde: liberacion.fecha,
    sinLocatario: true,
    ...(cambia
      ? {
          precioVigente: liberacion.precioNuevo,
          precioMinimo: liberacion.minimoNuevo,
          historial: [...local.historial, ...liberacion.registros],
        }
      : {}),
  });
  return {
    contratos: {
      ...contratos,
      terminaciones: {
        ...contratos.terminaciones,
        [liberacion.contratoId]: { fecha: liberacion.fecha, motivo: liberacion.motivo },
      },
    },
    locales: registrarBitacoraLocal(ajustado, liberacion.localId, {
      fecha: liberacion.fecha,
      autor,
      titulo: "Local liberado",
      detalle: `Contrato terminado: ${liberacion.motivo}. ${resumen}`,
    }),
  };
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

// --- estimaciones de pago -------------------------------------------------

/**
 * Registra y firma una estimación del contratista. Una captura inválida (volumen
 * mayor al validado en cortes) no cambia nada: el diálogo ya la bloquea.
 */
export function registrarEstimacion(
  estado: ObraState,
  entrada: EntradaEstimacion,
  autor: string,
  hoy: FechaISO,
  evidencia: Foto[],
): ObraState {
  const contrato = estado.contratos.find((c) => c.id === entrada.contratoObraId);
  if (
    !contrato ||
    !estimacionSinErrores(
      erroresEstimacion(contrato, estado.cortes, estado.estimaciones, entrada),
    )
  ) {
    return estado;
  }
  const id = `est-${String(estado.estimaciones.length + 1).padStart(4, "0")}`;
  return {
    ...estado,
    estimaciones: [
      ...estado.estimaciones,
      firmarEstimacion(id, contrato, entrada, estado.estimaciones, autor, hoy, evidencia),
    ],
  };
}

/**
 * La PMO autoriza o rechaza (con motivo) una estimación firmada. Al autorizar nace
 * el `PagoObra` por el importe bruto, que alimenta el costo real del valor ganado.
 */
export function resolverEstimacionObra(
  estado: ObraState,
  id: string,
  resolucion: "AUTORIZADA_PMO" | "RECHAZADA",
  autor: string,
  hoy: FechaISO,
  comentario?: string,
): ObraState {
  const actual = estado.estimaciones.find((e) => e.id === id);
  const contrato = actual && estado.contratos.find((c) => c.id === actual.contratoObraId);
  if (!actual || !contrato) return estado;
  const resuelta = resolverEstimacion(actual, resolucion, autor, hoy, comentario);
  if (resuelta === actual) return estado;
  if (resolucion === "RECHAZADA") {
    return {
      ...estado,
      estimaciones: estado.estimaciones.map((e) => (e.id === id ? resuelta : e)),
    };
  }
  const pago = pagoDeEstimacion(resuelta, contrato, hoy);
  return {
    ...estado,
    estimaciones: estado.estimaciones.map((e) =>
      e.id === id ? { ...resuelta, pagoId: pago.id } : e,
    ),
    pagos: [...estado.pagos, pago],
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

/**
 * La PMO adjudica la licitación al ganador de la última ronda cerrada, con motivo.
 * Con catálogo, además nace el contrato de obra con los PU del ganador (`proveedor`
 * del padrón y `fechas` válidas son obligatorios) y queda ligado en `contratoObraId`;
 * si falta algo, el estado queda igual.
 */
export function adjudicarLicitacion(
  estado: ObraState,
  id: string,
  ganadorId: string,
  motivo: string,
  autor: string,
  hoy: FechaISO,
  proveedor?: Pick<Proveedor, "id" | "nombre">,
  fechas?: FechasContrato,
): ObraState {
  const licitacion = estado.licitaciones.find((l) => l.id === id);
  if (!licitacion || errorAdjudicacion(licitacion, ganadorId, motivo) !== undefined) {
    return estado;
  }
  const adjudicada = conLicitacionAdjudicada(licitacion, ganadorId, motivo, autor, hoy);
  if (!tieneCatalogo(licitacion)) {
    return actualizarLicitacion(estado, id, () => adjudicada);
  }
  if (!proveedor || proveedor.id !== ganadorId || !fechas) return estado;
  if (errorFechasContrato(fechas, hoy) !== undefined) return estado;
  const contrato = contratoDeAdjudicacion(
    licitacion,
    proveedor,
    estado.contratos.filter((c) => c.terrenoId === licitacion.terrenoId),
    fechas,
  );
  if (!contrato || estado.contratos.some((c) => c.id === contrato.id)) return estado;
  return {
    ...actualizarLicitacion(estado, id, () => ({
      ...adjudicada,
      contratoObraId: contrato.id,
    })),
    contratos: [...estado.contratos, contrato],
  };
}

/** La PMO define o edita el catálogo mientras ninguna ronda tenga precios. */
export function definirCatalogo(
  estado: ObraState,
  id: string,
  conceptos: readonly ConceptoLicitacion[],
): ObraState {
  return actualizarLicitacion(estado, id, (l) => conCatalogo(l, conceptos));
}

/**
 * Envío simulado del catálogo: las invitaciones quedan en la bitácora de la
 * licitación y, si no hay ronda abierta, se abre la siguiente.
 */
export function enviarInvitaciones(
  estado: ObraState,
  id: string,
  proveedorIds: readonly string[],
  canal: CanalAviso,
  fecha: FechaISO,
  hora: string,
): ObraState {
  return actualizarLicitacion(estado, id, (l) =>
    conInvitaciones(l, proveedorIds, canal, fecha, hora),
  );
}

/** El contratista (o la PMO a su nombre) responde la ronda abierta por precio unitario. */
export function responderLicitacion(
  estado: ObraState,
  id: string,
  proveedorId: string,
  precios: readonly PrecioConcepto[],
  capturadaPor: CapturaRespuesta,
  fecha: FechaISO,
): ObraState {
  return actualizarLicitacion(estado, id, (l) =>
    conRespuesta(l, proveedorId, precios, capturadaPor, fecha),
  );
}

/** La PMO cierra la ronda abierta; exige al menos una respuesta. */
export function cerrarRonda(estado: ObraState, id: string): ObraState {
  return actualizarLicitacion(estado, id, conRondaCerrada);
}

// --- mantenimientos -------------------------------------------------------

/** Lo que captura el diálogo de alta: el resto lo fija el reducer (nace programado). */
export type NuevoMantenimiento = Omit<
  Mantenimiento,
  "id" | "folio" | "estatus" | "evidencia" | "fechaInicio" | "fechaFin" | "costoReal"
>;

const añoDe = (fecha: FechaISO) => Number(fecha.slice(0, 4));

/**
 * Si el trabajo pasa del presupuesto anual de su plaza, lo deja pendiente de
 * autorización (con el excedente); si cabe, o no hay presupuesto, lo devuelve igual.
 */
function conSobregiroSolicitado(
  estado: MantenimientosState,
  m: Mantenimiento,
  solicitadoPor: string,
  hoy: FechaISO,
): Mantenimiento {
  const año = añoDe(m.fechaProgramada);
  const presupuesto = estado.presupuestos.find(
    (p) => p.plazaId === m.plazaId && p.año === año,
  );
  const consumo = consumoPresupuesto(m.plazaId, año, estado.mantenimientos, m.id);
  if (!presupuesto || !requiereAutorizacion(m, presupuesto, consumo)) return m;
  return solicitarSobregiro(m, {
    solicitadoPor,
    hoy,
    excedente: excedenteSobregiro(m, presupuesto, consumo),
  });
}

/**
 * Da de alta un mantenimiento programado con el siguiente folio libre. Si excede
 * el presupuesto de su plaza nace pendiente de autorización de Dirección.
 */
export function agregarMantenimiento(
  estado: MantenimientosState,
  nuevo: NuevoMantenimiento,
  hoy: FechaISO,
  solicitadoPor: string,
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
  return {
    ...estado,
    mantenimientos: [
      ...estado.mantenimientos,
      conSobregiroSolicitado(estado, mantenimiento, solicitadoPor, hoy),
    ],
  };
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
    ...estado,
    mantenimientos: estado.mantenimientos.map((m) => (m.id === id ? siguiente : m)),
  };
}

/** Dirección autoriza o rechaza un sobregiro pendiente; rechazar exige comentario. */
export function resolverSobregiroMantenimiento(
  estado: MantenimientosState,
  id: string,
  decision: "AUTORIZADA" | "RECHAZADA",
  resueltoPor: string,
  hoy: FechaISO,
  comentario?: string,
): MantenimientosState {
  const actual = estado.mantenimientos.find((m) => m.id === id);
  const siguiente =
    actual && resolverSobregiro(actual, decision, { resueltoPor, hoy, comentario });
  if (!siguiente) return estado;
  return {
    ...estado,
    mantenimientos: estado.mantenimientos.map((m) => (m.id === id ? siguiente : m)),
  };
}

/** La PMO fija el presupuesto anual de una plaza (monto en MXN, 0 o más). */
export function fijarPresupuestoMantenimiento(
  estado: MantenimientosState,
  plazaId: string,
  año: number,
  monto: number,
): MantenimientosState {
  if (!Number.isFinite(monto) || monto < 0) return estado;
  const redondeado = Math.round(monto);
  const existe = estado.presupuestos.some((p) => p.plazaId === plazaId && p.año === año);
  return {
    ...estado,
    presupuestos: existe
      ? estado.presupuestos.map((p) =>
          p.plazaId === plazaId && p.año === año ? { ...p, monto: redondeado } : p,
        )
      : [...estado.presupuestos, { plazaId, año, monto: redondeado }],
  };
}

/** Liga una factura libre de la misma plaza al mantenimiento; si no procede, deja el estado igual. */
export function ligarFacturaSat(
  estado: MantenimientosState,
  facturaId: string,
  mantenimientoId: string,
): MantenimientosState {
  const factura = estado.facturasSat.find((f) => f.id === facturaId);
  const mantenimiento = estado.mantenimientos.find((m) => m.id === mantenimientoId);
  if (
    !factura ||
    !mantenimiento ||
    factura.mantenimientoId !== undefined ||
    factura.plazaId !== mantenimiento.plazaId
  ) {
    return estado;
  }
  return {
    ...estado,
    facturasSat: estado.facturasSat.map((f) =>
      f.id === facturaId ? { ...f, mantenimientoId } : f,
    ),
  };
}

/** Regresa una factura ligada a la bandeja de su plaza. */
export function desligarFacturaSat(
  estado: MantenimientosState,
  facturaId: string,
): MantenimientosState {
  const factura = estado.facturasSat.find((f) => f.id === facturaId);
  if (factura?.mantenimientoId === undefined) return estado;
  return {
    ...estado,
    facturasSat: estado.facturasSat.map((f) =>
      f.id === facturaId ? { ...f, mantenimientoId: undefined } : f,
    ),
  };
}

// --- padrón de proveedores -----------------------------------------------

/** Alta en el padrón; se ignora si el id ya existe o el RFC ya está registrado. */
export function agregarProveedor(
  estado: ProveedoresState,
  proveedor: Proveedor,
): ProveedoresState {
  if (estado.padron.some((p) => p.id === proveedor.id)) return estado;
  if (rfcEnUso(estado.padron, proveedor.rfc)) return estado;
  return { padron: [...estado.padron, proveedor] };
}

/** Reemplaza los datos de un proveedor; se ignora si no existe o el RFC es de otro. */
export function editarProveedor(
  estado: ProveedoresState,
  proveedor: Proveedor,
): ProveedoresState {
  if (!estado.padron.some((p) => p.id === proveedor.id)) return estado;
  if (rfcEnUso(estado.padron, proveedor.rfc, proveedor.id)) return estado;
  return {
    padron: estado.padron.map((p) => (p.id === proveedor.id ? proveedor : p)),
  };
}

// --- campañas comerciales ------------------------------------------------

/** Alta en el catálogo de campañas; se ignora si el id ya existe. */
export function agregarCampana(estado: CampanasState, campana: Campana): CampanasState {
  if (estado.campanas.some((c) => c.id === campana.id)) return estado;
  return { campanas: [...estado.campanas, campana] };
}

/** Reemplaza los datos de una campaña; se ignora si no existe. */
export function editarCampana(estado: CampanasState, campana: Campana): CampanasState {
  if (!estado.campanas.some((c) => c.id === campana.id)) return estado;
  return {
    campanas: estado.campanas.map((c) => (c.id === campana.id ? campana : c)),
  };
}

// --- servicio a clientes ---------------------------------------------------

/** Lo que captura el alta del caso: el resto lo fija el reducer (nace recibido). */
export type NuevoCaso = Pick<
  CasoServicio,
  "plazaId" | "localId" | "locatarioId" | "tipo" | "prioridad" | "canal" | "descripcion"
> &
  Pick<Partial<CasoServicio>, "facturaId">;

/** Id siguiente al mayor `cas-NNNN` (los folios reinician por año; los ids no). */
function siguienteIdCaso(casos: readonly CasoServicio[]): string {
  const maximo = casos.reduce(
    (mayor, c) => Math.max(mayor, Number(/^cas-(\d+)$/.exec(c.id)?.[1] ?? 0)),
    0,
  );
  return `cas-${String(maximo + 1).padStart(4, "0")}`;
}

function conEntrada(
  caso: CasoServicio,
  fecha: string,
  autor: string,
  texto: string,
): CasoServicio {
  const entrada = { id: `${caso.id}-b${caso.bitacora.length + 1}`, fecha, autor, texto };
  return { ...caso, bitacora: [...caso.bitacora, entrada] };
}

/** Aplica `cambio` al caso `id`; si no existe o `cambio` devuelve `undefined`, deja el estado igual. */
function cambiarCaso(
  estado: CasosState,
  id: string,
  cambio: (caso: CasoServicio) => CasoServicio | undefined,
): CasosState {
  const actual = estado.casos.find((c) => c.id === id);
  const siguiente = actual && cambio(actual);
  if (!siguiente) return estado;
  return { casos: estado.casos.map((c) => (c.id === id ? siguiente : c)) };
}

/** Registra un caso recibido con el siguiente folio del año; la factura solo en una aclaración. */
export function registrarCaso(
  estado: CasosState,
  nuevo: NuevoCaso,
  ahora: string,
  autor: string,
): CasosState {
  const { facturaId, ...datos } = nuevo;
  const caso: CasoServicio = {
    ...datos,
    ...(nuevo.tipo === "ACLARACION_FACTURA" && facturaId ? { facturaId } : {}),
    id: siguienteIdCaso(estado.casos),
    folio: siguienteFolioCaso(estado.casos, Number(ahora.slice(0, 4))),
    estatus: "RECIBIDO",
    abiertoEl: ahora,
    bitacora: [],
  };
  return {
    casos: [
      ...estado.casos,
      conEntrada(caso, ahora, autor, TEXTO_BITACORA_CASO.registrado(nuevo.canal)),
    ],
  };
}

/**
 * Responde al locatario. La primera respuesta fija `primeraRespuestaEl` y el
 * responsable y saca al caso de RECIBIDO; las siguientes solo quedan en la
 * bitácora. Un caso cerrado no se responde.
 */
export function responderCaso(
  estado: CasosState,
  id: string,
  texto: string,
  ahora: string,
  responsable: Pick<Usuario, "id" | "nombre">,
): CasosState {
  return cambiarCaso(estado, id, (caso) => {
    if (caso.estatus === "CERRADO") return undefined;
    const anotado = conEntrada(
      caso,
      ahora,
      responsable.nombre,
      TEXTO_BITACORA_CASO.respuesta(texto),
    );
    if (caso.primeraRespuestaEl !== undefined) return anotado;
    return {
      ...anotado,
      estatus: "EN_ATENCION",
      primeraRespuestaEl: ahora,
      responsableId: responsable.id,
    };
  });
}

/** Mueve el caso según su ciclo: RESUELTO fija `resueltoEl`; CERRADO guarda la calificación. */
export function transicionarCaso(
  estado: CasosState,
  id: string,
  destino: EstatusCaso,
  ahora: string,
  autor: string,
  calificacion?: number,
): CasosState {
  return cambiarCaso(estado, id, (caso) => {
    if (!validarTransicionCaso(caso, destino, calificacion).ok) return undefined;
    const cambiado: CasoServicio = { ...caso, estatus: destino };
    if (destino === "RESUELTO") cambiado.resueltoEl = ahora;
    // `validarTransicionCaso` ya exige la calificación al cerrar; el guardia la tipa.
    if (destino === "CERRADO" && esCalificacionCaso(calificacion))
      cambiado.calificacion = calificacion;
    return conEntrada(
      cambiado,
      ahora,
      autor,
      TEXTO_BITACORA_CASO.estatus(destino, calificacion),
    );
  });
}

/** Deja un comentario interno en la bitácora; no cuenta como respuesta. */
export function comentarCaso(
  estado: CasosState,
  id: string,
  texto: string,
  ahora: string,
  autor: string,
): CasosState {
  return cambiarCaso(estado, id, (caso) => conEntrada(caso, ahora, autor, texto));
}

/**
 * Escala el caso a un mantenimiento correctivo de origen locatario en su plaza
 * y su local, y en el mismo paso liga el mantenimiento creado al caso con su
 * entrada de bitácora. Si el caso no se puede escalar (`puedeEscalar`, que
 * evita el doble alta), deja ambos estados igual.
 */
export function escalarCaso(
  casos: CasosState,
  mantenimientos: MantenimientosState,
  casoId: string,
  nuevo: NuevoMantenimiento,
  ahora: string,
  solicitadoPor: string,
): { casos: CasosState; mantenimientos: MantenimientosState } {
  const caso = casos.casos.find((c) => c.id === casoId);
  if (!caso || !puedeEscalar(caso)) return { casos, mantenimientos };
  const siguientes = agregarMantenimiento(
    mantenimientos,
    {
      ...nuevo,
      tipo: "CORRECTIVO",
      origen: "LOCATARIO",
      plazaId: caso.plazaId,
      localId: caso.localId,
    },
    ahora.slice(0, 10),
    solicitadoPor,
  );
  const creado = siguientes.mantenimientos.at(-1);
  if (!creado) return { casos, mantenimientos };
  return {
    mantenimientos: siguientes,
    casos: cambiarCaso(casos, casoId, (c) =>
      conEntrada(
        { ...c, mantenimientoId: creado.id },
        ahora,
        solicitadoPor,
        TEXTO_BITACORA_CASO.escalado(creado.folio),
      ),
    ),
  };
}

// --- comisiones -------------------------------------------------------------

/**
 * Genera las comisiones de un contrato recién firmado de una cotización, con el
 * esquema vigente. `vendedorComercial` lo resuelve el llamador. Los ids que ya
 * existen se ignoran: firmar dos veces no duplica comisiones.
 */
export function registrarComisionesDeFirma(
  estado: ComisionesState,
  contrato: Contrato,
  cotizacion: Cotizacion,
  excepciones: readonly ExcepcionPrecio[],
  vendedorComercial: boolean,
  ahora: string,
): ComisionesState {
  const generadas = calcularComisiones(
    contrato,
    estado.esquema,
    {
      vendedorId: cotizacion.vendedorId,
      vendedorComercial,
      requirioExcepcion: cotizacionRequirioExcepcion(cotizacion.id, excepciones),
      mesesCobrados: mesesCobrados(cotizacion.plazoMeses, cotizacion.mesesGracia),
    },
    ahora,
  );
  const existentes = new Set(estado.comisiones.map((c) => c.id));
  const nuevas = generadas.filter((c) => !existentes.has(c.id));
  if (nuevas.length === 0) return estado;
  return { ...estado, comisiones: [...estado.comisiones, ...nuevas] };
}

/** Marca una comisión pendiente como pagada en `fecha`; inexistente o ya pagada, sin cambio. */
export function marcarComisionPagada(
  estado: ComisionesState,
  id: string,
  fecha: FechaISO,
): ComisionesState {
  const actual = estado.comisiones.find((c) => c.id === id);
  if (!actual || actual.pagadaEl !== undefined) return estado;
  return {
    ...estado,
    comisiones: estado.comisiones.map((c) => (c.id === id ? { ...c, pagadaEl: fecha } : c)),
  };
}

/** Reemplaza el esquema vigente; las comisiones ya generadas no cambian. */
export function editarEsquemaComisiones(
  estado: ComisionesState,
  esquema: EsquemaComisiones,
): ComisionesState {
  return { ...estado, esquema: { ...esquema, mandosMedios: [...esquema.mandosMedios] } };
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
    estatus = local.estatus,
    libreDesde = local.libreDesde,
  } = ajuste;
  const ajustado = {
    ...local,
    precioMinimo,
    precioVigente,
    regla,
    historial,
    estatus,
    libreDesde,
  };
  if (ajuste.sinLocatario) delete ajustado.locatarioId;
  return ajustado;
}
