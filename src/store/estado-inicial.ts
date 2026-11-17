import { PROGRAMACION_EMISION_INICIAL, REGLA_RECARGO_INICIAL } from "@/domain";
import { crearSeed } from "@/data/seed";
import type {
  AprobacionesState,
  CobranzaState,
  ContratosState,
  CotizacionesState,
  IntegracionesState,
  LocalesState,
  MetasState,
  MantenimientosState,
  ObraState,
  ProspectosState,
  ProveedoresState,
  ReglasDefaultState,
  TerrenosState,
} from "./reducers";

export interface SesionState {
  usuarioId: string | null;
}

export interface DatosDemo {
  session: SesionState;
  cotizaciones: CotizacionesState;
  aprobaciones: AprobacionesState;
  cobranza: CobranzaState;
  integraciones: IntegracionesState;
  locales: LocalesState;
  prospectos: ProspectosState;
  contratos: ContratosState;
  terrenos: TerrenosState;
  obra: ObraState;
  mantenimientos: MantenimientosState;
  proveedores: ProveedoresState;
  reglasDefault: ReglasDefaultState;
  metas: MetasState;
}

/**
 * Estado de la demo recién reiniciada. Las listas mutables (cotizaciones,
 * excepciones, bandeja anual, prospectos, terrenos, mantenimientos, padrón de proveedores) parten del seed; el resto de los datos se lee
 * siempre de los repositorios.
 */
export function crearEstadoInicial(): DatosDemo {
  const seed = crearSeed();
  return {
    session: { usuarioId: null },
    cotizaciones: { cotizaciones: seed.cotizaciones },
    aprobaciones: {
      excepciones: seed.excepciones,
      cambiosAnuales: seed.cambiosPropuestos,
    },
    cobranza: {
      seguimientos: {},
      avisados: [],
      plantillas: seed.plantillasAviso,
      programacion: seed.programacionAvisos,
      envios: seed.enviosAviso,
      emitidas: [],
      recargos: [],
      pagos: {},
      programacionEmision: PROGRAMACION_EMISION_INICIAL,
      reglaRecargo: REGLA_RECARGO_INICIAL,
    },
    integraciones: { sincronizaciones: {}, eventos: seed.eventosSync },
    locales: { ajustes: {} },
    prospectos: { prospectos: seed.prospectos },
    contratos: { nuevos: [], terminaciones: {}, aperturas: {} },
    terrenos: { terrenos: seed.terrenos },
    obra: {
      contratos: seed.obra.contratos,
      cronograma: seed.obra.cronograma,
      cortes: seed.obra.cortes,
      pagos: seed.obra.pagos,
      estimaciones: seed.obra.estimaciones,
      licitaciones: seed.licitaciones,
    },
    mantenimientos: {
      mantenimientos: seed.mantenimientos,
      presupuestos: seed.presupuestosMantenimiento,
      facturasSat: seed.facturasSat,
    },
    proveedores: { padron: seed.proveedores },
    reglasDefault: { porPlaza: {} },
    metas: { porPlaza: {} },
  };
}
