import { crearSeed } from "@/data/seed";
import type {
  AprobacionesState,
  CobranzaState,
  ContratosState,
  CotizacionesState,
  IntegracionesState,
  LocalesState,
  ProspectosState,
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
  reglasDefault: ReglasDefaultState;
}

/**
 * Estado de la demo recién reiniciada. Las listas mutables (cotizaciones,
 * excepciones, bandeja anual, prospectos, terrenos) parten del seed; el resto de los datos se lee
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
    cobranza: { seguimientos: {}, avisados: [] },
    integraciones: { sincronizaciones: {}, eventos: seed.eventosSync },
    locales: { ajustes: {} },
    prospectos: { prospectos: seed.prospectos },
    contratos: { nuevos: [] },
    terrenos: { terrenos: seed.terrenos },
    reglasDefault: { porPlaza: {} },
  };
}
