/** Fecha calendario en ISO `YYYY-MM-DD`. */
export type FechaISO = string;

export type Rol =
  "DIRECCION" | "VENTAS" | "SUPERADMIN" | "COBRANZA" | "PMO" | "SUPERVISOR_OBRA";

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  cargo: string;
}

export interface Ciudad {
  id: string;
  nombre: string;
  estado: string;
  lat: number;
  lng: number;
}

export interface Geometria {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Planta {
  id: string;
  plazaId: string;
  nombre: string;
  ancho: number;
  alto: number;
}

export type TipoRegla = "INPC" | "INPC_PTS" | "VALOR_FIJO";
export type CuandoAplica = "ENERO" | "ANIVERSARIO";
export type ModoRegla = "AUTOMATICO" | "SEMIAUTOMATICO";

export interface ReglaActualizacion {
  tipo: TipoRegla;
  /** Puntos porcentuales sumados al INPC (solo `INPC_PTS`). */
  puntos?: number;
  /** Porcentaje anual fijo (solo `VALOR_FIJO`). */
  porcentajeFijo?: number;
  /** 1 de enero si el local está libre; aniversario si está rentado. */
  cuando: CuandoAplica;
  /** Semiautomático: el cambio pasa por la bandeja de aprobación. */
  modo: ModoRegla;
}

/** De dónde sale la regla de un local: el default de su plaza o una propia. */
export type OrigenRegla = "HEREDADA" | "PERSONALIZADA" | "SIN_DEFAULT";

export type EstatusPlaza = "EN_OPERACION" | "PREVENTA";

/** Posición geográfica en grados decimales. */
export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Plaza {
  id: string;
  nombre: string;
  ciudadId: string;
  estatus: EstatusPlaza;
  /** Ubicación de la plaza en el mapa (ficticia en la demo). */
  coordenadas: Coordenadas;
  direccion?: string;
  reglaDefault?: ReglaActualizacion;
  /** Meta de cumplimiento del plan de ingresos, en % (la edita la PMO). */
  metaCumplimientoPct: number;
}

export type EstatusLocal = "DISPONIBLE" | "OCUPADO" | "EN_COTIZACION" | "PREVENTA";

/** Serie de precios a la que pertenece un registro del historial. */
export type ConceptoPrecio = "LISTA" | "MINIMO";

export interface RegistroPrecio {
  fecha: FechaISO;
  precio: number;
  motivo: string;
  /** Serie del registro; si se omite vale `LISTA` (compatibilidad con historiales previos). */
  concepto?: ConceptoPrecio;
}

export interface Local {
  id: string;
  plazaId: string;
  plantaId: string;
  codigo: string;
  estatus: EstatusLocal;
  areaM2: number;
  precioVigente: number;
  /** Piso definido por la PMO; debajo solo se renta con autorización de Dirección. */
  precioMinimo: number;
  /** Renta del modelo financiero de la PMO; base del cumplimiento del plan de ingresos. */
  rentaPlaneada: number;
  regla: ReglaActualizacion;
  geometria: Geometria;
  locatarioId?: string;
  historial: RegistroPrecio[];
  giro?: string;
  /** Local ancla de la plaza (más ancho en el plano). */
  ancla?: boolean;
  /** Fecha en que quedó libre (solo locales disponibles). */
  libreDesde?: FechaISO;
}

/** Imagen estática servida desde `public/`. */
export interface Foto {
  /** Ruta absoluta bajo public/, p. ej. "/locales/alimentos/03.webp". */
  src: string;
  /** Descripción en español. */
  alt: string;
  /** Ancho del archivo en px. */
  ancho: number;
  /** Alto del archivo en px. */
  alto: number;
}

export interface Locatario {
  id: string;
  nombre: string;
  giro?: string;
}

/**
 * Ciclo de vida del contrato. "Por vencer" y "vencido" no se guardan: se
 * derivan de las fechas de un contrato `VIGENTE`.
 */
export type EstadoContrato = "BORRADOR" | "EN_FIRMA" | "VIGENTE" | "TERMINADO";

export interface Contrato {
  id: string;
  localId: string;
  locatarioId: string;
  inicio: FechaISO;
  fin: FechaISO;
  rentaMensual: number;
  estado: EstadoContrato;
  /** Folio `CTR-AAAA-NNNN` del contrato que nació de una cotización. */
  folio?: string;
  /** Cotización de la que nació el contrato, si la hay. */
  cotizacionId?: string;
}

export type EstadoCambio = "PENDIENTE" | "APROBADO" | "RECHAZADO";

export interface CambioPropuesto {
  localId: string;
  año: number;
  precioActual: number;
  precioPropuesto: number;
  /** Mínimo autorizado vigente del local. */
  minimoActual: number;
  /** Mínimo que propone la regla; nunca queda sobre el precio propuesto. */
  minimoPropuesto: number;
  /** Variación porcentual respecto al precio actual. */
  variacionPct: number;
  estado: EstadoCambio;
}

/**
 * Instantánea del prospecto que consta en la cotización. Sobrevive aunque el
 * prospecto cambie después: los candados y el contrato leen de aquí.
 */
export interface ProspectoCotizacion {
  nombre: string;
  documentosCompletos: boolean;
  /** Aval o fianza registrada (descripción); ausente si falta. */
  aval?: string;
}

export type EtapaProspecto =
  "NUEVO" | "CONTACTADO" | "VISITA" | "COTIZADO" | "GANADO" | "PERDIDO";

export type OrigenProspecto =
  "REFERIDO" | "SITIO_WEB" | "LLAMADA" | "REDES" | "BROKER" | "EVENTO";

export interface ContactoProspecto {
  nombre: string;
  telefono: string;
  correo: string;
}

/** Hecho del seguimiento comercial de un prospecto. */
export interface ActividadProspecto {
  id: string;
  titulo: string;
  fecha: FechaISO;
  /** Hora "HH:MM" del hecho, si se conoce. */
  hora?: string;
}

/** Prospecto como entidad propia del embudo comercial; `nombre` es la razón social. */
export interface Prospecto extends ProspectoCotizacion {
  id: string;
  rfc: string;
  giro: string;
  contacto: ContactoProspecto;
  origen: OrigenProspecto;
  etapa: EtapaProspecto;
  /** Locales por los que muestra interés. */
  localIds: string[];
  creadoEl: FechaISO;
  /** Seguimiento, de más antiguo a más reciente. */
  actividad: ActividadProspecto[];
}

export type EstadoCotizacion = "BORRADOR" | "ENVIADA" | "CONTRATO_GENERADO";

/** Hecho previo de la cotización (visita, envío…) que consta en su actividad. */
export interface EventoCotizacion {
  id: string;
  titulo: string;
  fecha: FechaISO;
  /** Hora "HH:MM" del evento, si se conoce. */
  hora?: string;
}

export interface Cotizacion {
  id: string;
  localId: string;
  prospecto: ProspectoCotizacion;
  /** Prospecto registrado; ausente si se capturó a mano sin darlo de alta. */
  prospectoId?: string;
  rentaMensual: number;
  plazoMeses: number;
  emitidaEl: FechaISO;
  vigenteHasta: FechaISO;
  estado: EstadoCotizacion;
  /** Regla de actualización al emitirla: instantánea que no sigue cambios posteriores. */
  reglaPactada: ReglaActualizacion;
  /** Si la regla pactada era el default de la plaza o la propia del local. */
  origenRegla: OrigenRegla;
  /** Depósito en garantía, en meses de renta (por omisión 1). */
  depositoMeses?: number;
  /** Meses de gracia sin renta al inicio del contrato (por omisión 0). */
  mesesGracia?: number;
  /** Inicio previsto del contrato; por omisión, el día de emisión. */
  inicioContrato?: FechaISO;
  /** Fecha en que se generó el borrador de contrato. */
  contratoGeneradoEl?: FechaISO;
  /** Giro del prospecto; por omisión, el del local. */
  giro?: string;
  /** Quién elaboró la cotización ("Nombre · Área"). */
  elaboro?: string;
  /** Hechos previos, de más antiguo a más reciente. */
  actividad?: EventoCotizacion[];
}

/**
 * Flujo de dos pasos: Ventas solicita (PENDIENTE), Dirección autoriza
 * (AUTORIZADA_DIRECCION) y la PMO aplica (APLICADA). Cualquiera de las dos
 * puede rechazar con comentario.
 */
export type EstadoExcepcion =
  "PENDIENTE" | "AUTORIZADA_DIRECCION" | "APLICADA" | "RECHAZADA";

export interface ExcepcionPrecio {
  id: string;
  cotizacionId: string;
  localId: string;
  rentaSolicitada: number;
  precioMinimo: number;
  estado: EstadoExcepcion;
  solicitadaPor: string;
  /** Justificación de Ventas al solicitar. */
  motivo?: string;
  solicitadaEn?: FechaISO;
  autorizadaPor?: string;
  autorizadaEn?: FechaISO;
  aplicadaPor?: string;
  aplicadaEn?: FechaISO;
  rechazadaPor?: string;
  rechazadaEn?: FechaISO;
  /** Comentario de Dirección al autorizar o rechazar. */
  comentarioDireccion?: string;
  /** Comentario de la PMO al aplicar o rechazar. */
  comentarioPmo?: string;
}

export type EstadoCandado = "CUMPLE" | "FALLA" | "EXCEPCION";
export type IdCandado =
  "COTIZACION_OFICIAL" | "PRECIO_MINIMO" | "DISPONIBILIDAD" | "EXPEDIENTE" | "AVAL";

export interface Candado {
  id: IdCandado;
  nombre: string;
  estado: EstadoCandado;
  detalle: string;
}

export interface Factura {
  id: string;
  localId: string;
  locatarioId: string;
  /** Mes facturado, `YYYY-MM`. */
  mes: string;
  monto: number;
  vencimiento: FechaISO;
  pagadaEl?: FechaISO;
  /** Folio del CFDI. */
  folio?: string;
  /** Último seguimiento de cobranza. */
  seguimiento?: string;
  /** Seguimientos previos y el actual, del más antiguo al más reciente. */
  historial?: string[];
}

export type EstatusCobro = "PAGADA" | "VIGENTE" | "VENCIDA";

/** Diferencia detectada al conciliar un pago contra la póliza de EnKontrol. */
export interface DiferenciaConciliacion {
  id: string;
  facturaId: string;
  concepto: string;
  monto: number;
}

export type EtapaTerreno =
  "PROSPECCION" | "DUE_DILIGENCE" | "PERMISOS" | "CONSTRUCCION" | "PREVENTA" | "ABIERTO";

export type SemaforoTerreno = "VERDE" | "AMARILLO" | "ROJO";

export interface HitoTerreno {
  id: string;
  titulo: string;
  fecha: FechaISO;
  cumplido: boolean;
}

/** Terreno o proyecto en desarrollo; los de preventa se enlazan a su plaza. */
export interface Terreno {
  id: string;
  nombre: string;
  ciudadId: string;
  /** Plaza en el catálogo, cuando el proyecto ya tiene una. */
  plazaId?: string;
  etapa: EtapaTerreno;
  /** Avance de la etapa actual, 0-100. */
  avancePct: number;
  /** Cuándo arrancó el desarrollo. */
  inicioDesarrollo: FechaISO;
  fechaObjetivo: FechaISO;
  responsable: string;
  areaM2: number;
  localesProyectados: number;
  hitos: HitoTerreno[];
  /**
   * Semáforo derivado del valor ganado. Lo fija `aplicarResumenObra` al leer los
   * proyectos con contratos de obra (no se persiste) y manda sobre el calculado
   * por avance manual.
   */
  semaforoObra?: SemaforoTerreno;
}

export type PartidaObra =
  | "TERRACERIAS"
  | "CIMENTACION"
  | "ESTRUCTURA"
  | "MUROS"
  | "INST_HIDRAULICAS"
  | "INST_ELECTRICAS"
  | "TECHOS"
  | "ACABADOS";

export type UnidadObra = "M2" | "M3" | "ML" | "PZA" | "KG" | "LOTE";

/** Renglón del presupuesto de un contrato; su importe se deriva (`volumen × PU`). */
export interface ConceptoObra {
  id: string;
  clave: string;
  descripcion: string;
  unidad: UnidadObra;
  volumenContratado: number;
  /** Precio unitario en MXN. */
  precioUnitario: number;
}

/** Contrato de obra de un proyecto: una partida, un contratista y sus conceptos. */
export interface ContratoObra {
  id: string;
  /** Folio con la forma "CO-VR-01". */
  folio: string;
  terrenoId: string;
  partida: PartidaObra;
  contratista: string;
  conceptos: ConceptoObra[];
  inicioPlan: FechaISO;
  finPlan: FechaISO;
}

export type FaseCronograma =
  "DISENO" | "PRESUPUESTO" | "LICITACION" | "CONSTRUCCION" | "ENTREGA";

/** Actividad del cronograma del proyecto (de construcción, ligada a un contrato). */
export interface ActividadCronograma {
  id: string;
  terrenoId: string;
  fase: FaseCronograma;
  titulo: string;
  inicioPlan: FechaISO;
  finPlan: FechaISO;
  inicioReal?: FechaISO;
  finReal?: FechaISO;
  /** Contrato que ejecuta la actividad (solo en la fase de construcción). */
  contratoObraId?: string;
}

export type EstadoCorte =
  "CAPTURADO" | "FIRMADO_SUPERVISOR" | "VALIDADO_PMO" | "RECHAZADO";

/** Volumen ejecutado de un concepto en la semana del corte (no el acumulado). */
export interface VolumenCorte {
  conceptoId: string;
  volumen: number;
}

/** Corte semanal de un contrato: lo ejecutado esa semana, firmado y luego validado. */
export interface CorteSemanal {
  id: string;
  contratoObraId: string;
  /** Lunes ISO de la semana reportada. */
  semana: FechaISO;
  volumenes: VolumenCorte[];
  estado: EstadoCorte;
  capturadoPor: string;
  firmadoPor?: string;
  firmadoEn?: FechaISO;
  /** Quien validó o rechazó el corte (PMO). */
  validadoPor?: string;
  validadoEn?: FechaISO;
  comentario?: string;
  evidencia: Foto[];
}

/** Pago a un contratista (costo real, AC), importado de EnKontrol de forma simulada. */
export interface PagoObra {
  id: string;
  contratoObraId: string;
  fecha: FechaISO;
  monto: number;
  folioFactura: string;
}

export type IdIntegracion = "ENKONTROL" | "EXCEL" | "MONDAY" | "MSPROJECT";

export type EstadoIntegracionSistema = "CONECTADA" | "CON_DIFERENCIAS" | "ERROR";

/** Dato clave que muestra la card de una integración. */
export interface MetricaIntegracion {
  etiqueta: string;
  valor: string;
}

export interface Integracion {
  id: IdIntegracion;
  nombre: string;
  descripcion: string;
  estado: EstadoIntegracionSistema;
  /** Último sync, ISO con hora. */
  ultimoSync: string;
  metricas: MetricaIntegracion[];
}

export type ResultadoSync = "OK" | "ADVERTENCIA" | "ERROR";

/** Renglón del log de sincronizaciones. */
export interface EventoSync {
  id: string;
  integracionId: IdIntegracion;
  /** ISO con hora. */
  fecha: string;
  resultado: ResultadoSync;
  detalle: string;
  registros: number;
}

// --- licitación de obra ----------------------------------------------------

/** Contratista o proveedor al que se invita a licitar una partida de obra. */
export interface ProveedorObra {
  id: string;
  nombre: string;
  especialidades: PartidaObra[];
}

/** Lo que un proveedor ofreció en una ronda (sin `monto` = no respondió). */
export interface PropuestaRonda {
  proveedorId: string;
  respondio: boolean;
  monto?: number;
  nota?: string;
}

/** Ronda de propuestas; de la 2 en adelante solo participan los que siguen en la competencia. */
export interface RondaLicitacion {
  numero: number;
  fecha: FechaISO;
  propuestas: PropuestaRonda[];
}

export type EstadoLicitacion = "EN_CURSO" | "ADJUDICADA";

/** Proveedor sacado de la competencia al cierre de la ronda `ronda`. */
export interface DescarteLicitacion {
  proveedorId: string;
  ronda: number;
  motivo: string;
}

/** Proceso de licitación de una partida de obra, con su historial de rondas. */
export interface Licitacion {
  id: string;
  /** Folio con la forma "LIC-VR-01". */
  folio: string;
  terrenoId: string;
  partida: PartidaObra;
  /** Presupuesto base interno contra el que se compara la oferta. */
  presupuestoBase: number;
  invitados: string[];
  descartados: DescarteLicitacion[];
  rondas: RondaLicitacion[];
  estado: EstadoLicitacion;
  ganadorId?: string;
  montoAdjudicado?: number;
  motivoSeleccion?: string;
  adjudicadaPor?: string;
  adjudicadaEn?: FechaISO;
  /** Contrato de obra que nació de la adjudicación (si ya se firmó). */
  contratoObraId?: string;
}

export type TipoMantenimiento = "PREVENTIVO" | "CORRECTIVO";

export type EstatusMantenimiento =
  "PROGRAMADO" | "EN_PROCESO" | "FINALIZADO" | "CANCELADO";

export type CategoriaMantenimiento =
  "PINTURA" | "IMPERMEABILIZACION" | "ELECTRICO" | "PLOMERIA" | "CLIMA" | "LIMPIEZA";

/** Quién pidió el trabajo. */
export type OrigenMantenimiento = "ADMINISTRACION" | "LOCATARIO";

/** Quién paga el trabajo. */
export type CargoMantenimiento = "PLAZA" | "LOCATARIO";

export interface Proveedor {
  id: string;
  nombre: string;
  especialidades: CategoriaMantenimiento[];
}

/** Trabajo de mantenimiento de una plaza o de uno de sus locales. Montos en MXN. */
export interface Mantenimiento {
  id: string;
  /** `MNT-<año>-<NNNN>`, consecutivo. */
  folio: string;
  plazaId: string;
  /** Vacío cuando el trabajo es de áreas comunes. */
  localId?: string;
  titulo: string;
  descripcion: string;
  tipo: TipoMantenimiento;
  categoria: CategoriaMantenimiento;
  origen: OrigenMantenimiento;
  estatus: EstatusMantenimiento;
  proveedorId: string;
  fechaProgramada: FechaISO;
  fechaInicio?: FechaISO;
  fechaFin?: FechaISO;
  costoEstimado: number;
  costoReal?: number;
  cargoA: CargoMantenimiento;
  /** Fotos del antes y el después. */
  evidencia: Foto[];
}
