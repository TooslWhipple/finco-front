import type {
  CambioPropuesto,
  Ciudad,
  Contrato,
  Cotizacion,
  DiferenciaConciliacion,
  ExcepcionPrecio,
  EventoSync,
  Factura,
  Integracion,
  Local,
  Locatario,
  Planta,
  Plaza,
  Prospecto,
  ReglaActualizacion,
  Terreno,
  Usuario,
} from "@/domain";

/**
 * Contratos de acceso a datos. La UI solo conoce estas interfaces: pasar a una
 * API real es escribir otra implementación, sin tocar pantallas.
 */

export interface PlazasRepository {
  listarCiudades(): Promise<Ciudad[]>;
  listarPlazas(): Promise<Plaza[]>;
  obtenerPlaza(id: string): Promise<Plaza | undefined>;
  listarPlantas(plazaId: string): Promise<Planta[]>;
}

export interface LocalesRepository {
  listar(): Promise<Local[]>;
  listarPorPlaza(plazaId: string): Promise<Local[]>;
  obtener(id: string): Promise<Local | undefined>;
  listarLocatarios(): Promise<Locatario[]>;
  obtenerLocatario(id: string): Promise<Locatario | undefined>;
  listarContratos(): Promise<Contrato[]>;
  contratoVigenteDe(localId: string): Promise<Contrato | undefined>;
  /** Cambios de la bandeja de actualización anual del año indicado. */
  listarCambiosPropuestos(año: number): Promise<CambioPropuesto[]>;
}

export interface CotizacionesRepository {
  listar(): Promise<Cotizacion[]>;
  obtener(id: string): Promise<Cotizacion | undefined>;
  listarPorLocal(localId: string): Promise<Cotizacion[]>;
  listarExcepciones(): Promise<ExcepcionPrecio[]>;
  /** Folio libre para la siguiente cotización (`COT-AAAA-NNNN`). */
  siguienteFolio(): Promise<string>;
}

export interface CobranzaRepository {
  /** Cuentas por cobrar del corte de un mes (`YYYY-MM`): las del mes y la cartera vencida arrastrada. Vacío si el mes no tiene facturación. */
  listarCorte(mes: string): Promise<Factura[]>;
  obtener(id: string): Promise<Factura | undefined>;
}

export interface EstadoIntegracion {
  /** Último sync, ISO con hora. */
  ultimoSync: string;
  facturasTimbradas: number;
  facturasTotales: number;
  pagosAplicados: number;
  polizasGeneradas: number;
  diferencias: DiferenciaConciliacion[];
  /** Fracción conciliada (0-1). */
  conciliacion: number;
}

export interface IntegracionesService {
  /** Las integraciones configuradas, con su último sync del seed. */
  listar(): Promise<Integracion[]>;
  /** Log inicial de sincronizaciones, del más antiguo al más reciente. */
  listarEventos(): Promise<EventoSync[]>;
  obtenerEstado(): Promise<EstadoIntegracion>;
  /** Dispara una sincronización con EnKontrol y devuelve el estado resultante. */
  sincronizar(ahora: string): Promise<EstadoIntegracion>;
}

export interface ProspectosRepository {
  listar(): Promise<Prospecto[]>;
}

export interface ContratosRepository {
  listar(): Promise<Contrato[]>;
}

export interface TerrenosRepository {
  listar(): Promise<Terreno[]>;
}

/** Parámetros del dominio que la pantalla de Configuración muestra en solo lectura. */
export interface ParametrosSistema {
  /** INPC anual por año (fracción). */
  inpcAnual: Readonly<Record<number, number>>;
  horasApartado: number;
  /** Umbrales (fracción 0-1) de ocupación alta y media. */
  umbralOcupacionAlta: number;
  umbralOcupacionMedia: number;
}

export interface ConfiguracionRepository {
  listarUsuarios(): Promise<Usuario[]>;
  /** Regla de actualización por default de cada plaza que la tiene, por id de plaza. */
  reglasDefault(): Promise<Record<string, ReglaActualizacion>>;
  obtenerParametros(): Promise<ParametrosSistema>;
}

export interface Repositorios {
  plazas: PlazasRepository;
  locales: LocalesRepository;
  cotizaciones: CotizacionesRepository;
  cobranza: CobranzaRepository;
  prospectos: ProspectosRepository;
  contratos: ContratosRepository;
  terrenos: TerrenosRepository;
  integraciones: IntegracionesService;
  configuracion: ConfiguracionRepository;
}
