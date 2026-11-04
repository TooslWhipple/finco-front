import type {
  Ciudad,
  Contrato,
  Factura,
  FechaISO,
  Local,
  Plaza,
  Prospecto,
  Terreno,
} from "@/domain";

/** Estado de la demo sobre el que se calculan los reportes y las respuestas del asistente. */
export interface DatosReporte {
  ciudades: readonly Ciudad[];
  plazas: readonly Plaza[];
  locales: readonly Local[];
  contratos: readonly Contrato[];
  facturas: readonly Factura[];
  prospectos: readonly Prospecto[];
  terrenos: readonly Terreno[];
  hoy: FechaISO;
}

export type FormatoValor = "numero" | "moneda" | "porcentaje";

/** Tono de una barra; la gráfica lo traduce a un color de la paleta. */
export type TonoBarra = "verde" | "ambar" | "rojo" | "indigo" | "primario";

export interface PuntoGrafica {
  etiqueta: string;
  valor: number;
  tono?: TonoBarra;
}

export interface Grafica {
  /** Nombre de la serie (aparece en el tooltip). */
  serie: string;
  formato: FormatoValor;
  puntos: PuntoGrafica[];
}

export type Celda = string | number;

export interface ColumnaTabla {
  clave: string;
  etiqueta: string;
  /** Sin formato, la celda se muestra como texto. */
  formato?: FormatoValor;
}

export interface TablaReporte {
  columnas: ColumnaTabla[];
  filas: Record<string, Celda>[];
}

export interface ResultadoReporte {
  /** Lectura en una línea de lo que muestra el reporte. */
  resumen: string;
  grafica: Grafica;
  tabla: TablaReporte;
}

/** Alcance de un reporte: toda la cartera, una ciudad o una plaza. */
export interface FiltroReporte {
  ciudadId: string;
  plazaId: string;
}
