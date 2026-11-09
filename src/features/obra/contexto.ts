import type {
  ActividadCronograma,
  Ciudad,
  Coordenadas,
  ContratoObra,
  CorteSemanal,
  FechaISO,
  Licitacion,
  PagoObra,
  Rol,
  Terreno,
} from "@/domain";

/** Lo que reciben todas las pestañas del expediente de un proyecto. */
export interface ContextoExpediente {
  terreno: Terreno;
  ciudad?: Ciudad;
  posicion?: Coordenadas;
  contratos: readonly ContratoObra[];
  cronograma: readonly ActividadCronograma[];
  /** Cortes del proyecto, del más reciente al más antiguo. */
  cortes: readonly CorteSemanal[];
  pagos: readonly PagoObra[];
  licitaciones: readonly Licitacion[];
  /** Licitación que se abre al entrar a su pestaña (viene del enlace "Ver licitación"). */
  licitacionEnfocadaId: string | null;
  /** Cambia a la pestaña de licitaciones con esa licitación abierta. */
  abrirLicitacion: (licitacionId: string) => void;
  hoy: FechaISO;
  rol: Rol | null;
}
