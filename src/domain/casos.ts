import { horasEntre } from "./fechas";
import type {
  CanalCaso,
  CasoServicio,
  EstatusCaso,
  PrioridadCaso,
  TipoCaso,
} from "./tipos";

/**
 * Servicio a clientes: metas de primera respuesta, ciclo del caso y su
 * estadística. Ninguna función lee el "ahora" de la demo: lo recibe (`ahora`,
 * ISO con hora sin zona) para que el dominio no dependa de `lib/tiempo.ts`.
 */

/** Horas para dar la primera respuesta según la prioridad. */
export const META_PRIMERA_RESPUESTA_HORAS: Readonly<Record<PrioridadCaso, number>> = {
  ALTA: 4,
  MEDIA: 24,
  BAJA: 72,
};

/** Bajo esta fracción de la meta por consumir, un caso sin respuesta está por vencer. */
const FRACCION_POR_VENCER = 0.25;

/** Ventana de los KPIs globales: los últimos 30 días, en horas. */
const HORAS_VENTANA_KPIS = 30 * 24;

export const TIPOS_CASO: readonly TipoCaso[] = [
  "FALLA",
  "FUGA",
  "DANO",
  "ACLARACION_FACTURA",
  "CONSULTA",
  "OTRO",
];

export const PRIORIDADES_CASO: readonly PrioridadCaso[] = ["ALTA", "MEDIA", "BAJA"];

/** Estatus en el orden del ciclo. */
export const ESTATUS_CASO: readonly EstatusCaso[] = [
  "RECIBIDO",
  "EN_ATENCION",
  "RESUELTO",
  "CERRADO",
];

export const CANALES_CASO: readonly CanalCaso[] = [
  "TELEFONO",
  "CORREO",
  "WHATSAPP",
  "PRESENCIAL",
];

export const ETIQUETA_TIPO_CASO: Readonly<Record<TipoCaso, string>> = {
  FALLA: "Falla",
  FUGA: "Fuga",
  DANO: "Daño",
  ACLARACION_FACTURA: "Aclaración de factura",
  CONSULTA: "Inquietud o consulta",
  OTRO: "Otro",
};

export const ETIQUETA_PRIORIDAD_CASO: Readonly<Record<PrioridadCaso, string>> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

export const ETIQUETA_ESTATUS_CASO: Readonly<Record<EstatusCaso, string>> = {
  RECIBIDO: "Recibido",
  EN_ATENCION: "En atención",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
};

export const ETIQUETA_CANAL_CASO: Readonly<Record<CanalCaso, string>> = {
  TELEFONO: "Teléfono",
  CORREO: "Correo",
  WHATSAPP: "WhatsApp",
  PRESENCIAL: "Presencial",
};

/** Un caso sigue abierto mientras no se resuelve. */
export function casoAbierto(caso: Pick<CasoServicio, "estatus">): boolean {
  return caso.estatus === "RECIBIDO" || caso.estatus === "EN_ATENCION";
}

/** Textos de la bitácora del caso: los mismos en la semilla y en las acciones del store. */
export const TEXTO_BITACORA_CASO = {
  registrado: (canal: CanalCaso) =>
    `Caso registrado (${ETIQUETA_CANAL_CASO[canal].toLowerCase()}).`,
  respuesta: (texto: string) => `Respuesta al locatario: ${texto}`,
  estatus: (destino: EstatusCaso, calificacion?: number) =>
    destino === "CERRADO"
      ? `Caso cerrado con calificación ${calificacion} de 5.`
      : `Caso ${ETIQUETA_ESTATUS_CASO[destino].toLowerCase()}.`,
  escalado: (folioMantenimiento: string) =>
    `Escalado a mantenimiento ${folioMantenimiento}.`,
} as const;

// --- folios ----------------------------------------------------------------

/** Consecutivo de un folio `CAS-AAAA-NNNN` del año dado; `undefined` si es de otro año o forma. */
function consecutivoDeFolioCaso(folio: string, anio: number): number | undefined {
  const partes = /^CAS-(\d{4})-(\d{4,})$/.exec(folio);
  return partes && Number(partes[1]) === anio ? Number(partes[2]) : undefined;
}

/** Folio siguiente al mayor del año (`CAS-AAAA-NNNN`); el consecutivo reinicia cada año. */
export function siguienteFolioCaso(
  casos: readonly Pick<CasoServicio, "folio">[],
  anio: number,
): string {
  const maximo = casos.reduce(
    (mayor, c) => Math.max(mayor, consecutivoDeFolioCaso(c.folio, anio) ?? 0),
    0,
  );
  return `CAS-${anio}-${String(maximo + 1).padStart(4, "0")}`;
}

// --- transiciones ------------------------------------------------------------

/**
 * Destinos de cada estatus. `RECIBIDO` no tiene: solo sale al responder
 * (`responderCaso`), que lo pasa a `EN_ATENCION`. No se reabre un caso.
 */
const TRANSICIONES_CASO: Readonly<Record<EstatusCaso, readonly EstatusCaso[]>> = {
  RECIBIDO: [],
  EN_ATENCION: ["RESUELTO"],
  RESUELTO: ["CERRADO"],
  CERRADO: [],
};

export function transicionesPermitidas(estatus: EstatusCaso): readonly EstatusCaso[] {
  return TRANSICIONES_CASO[estatus];
}

export type ResultadoTransicionCaso = { ok: true } | { ok: false; error: string };

/** ¿Es `valor` una calificación válida (entero de 1 a 5)? */
export function esCalificacionCaso(
  valor: number | undefined,
): valor is NonNullable<CasoServicio["calificacion"]> {
  return valor !== undefined && Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

/** Valida pasar el caso a `destino`; cerrar exige la calificación del locatario (1 a 5). */
export function validarTransicionCaso(
  caso: Pick<CasoServicio, "estatus">,
  destino: EstatusCaso,
  calificacion?: number,
): ResultadoTransicionCaso {
  if (!transicionesPermitidas(caso.estatus).includes(destino)) {
    return {
      ok: false,
      error: `Un caso ${ETIQUETA_ESTATUS_CASO[caso.estatus].toLowerCase()} no puede pasar a ${ETIQUETA_ESTATUS_CASO[destino].toLowerCase()}.`,
    };
  }
  if (destino === "CERRADO" && !esCalificacionCaso(calificacion)) {
    return {
      ok: false,
      error: "Para cerrar el caso registra la calificación del 1 al 5.",
    };
  }
  return { ok: true };
}

// --- metas -------------------------------------------------------------------

export type EstadoMetaCaso = "EN_TIEMPO" | "POR_VENCER" | "FUERA_DE_TIEMPO";

/** Horas que tardó la primera respuesta; `undefined` si aún no la hay. */
export function horasPrimeraRespuesta(
  caso: Pick<CasoServicio, "abiertoEl" | "primeraRespuestaEl">,
): number | undefined {
  return caso.primeraRespuestaEl === undefined
    ? undefined
    : horasEntre(caso.abiertoEl, caso.primeraRespuestaEl);
}

/**
 * Meta de primera respuesta. Con respuesta: en tiempo si tardó hasta la meta.
 * Sin respuesta: fuera de tiempo si ya pasó la meta y por vencer si queda menos
 * del 25 % de ella.
 */
export function estadoMeta(
  caso: Pick<CasoServicio, "prioridad" | "abiertoEl" | "primeraRespuestaEl">,
  ahora: string,
): EstadoMetaCaso {
  const meta = META_PRIMERA_RESPUESTA_HORAS[caso.prioridad];
  const tardo = horasPrimeraRespuesta(caso);
  if (tardo !== undefined) return tardo <= meta ? "EN_TIEMPO" : "FUERA_DE_TIEMPO";
  const transcurridas = horasEntre(caso.abiertoEl, ahora);
  if (transcurridas > meta) return "FUERA_DE_TIEMPO";
  return meta - transcurridas < meta * FRACCION_POR_VENCER ? "POR_VENCER" : "EN_TIEMPO";
}

/** Tipos que se pueden escalar a un mantenimiento correctivo. */
const TIPOS_ESCALABLES: readonly TipoCaso[] = ["FALLA", "FUGA", "DANO"];

/** Solo una falla, fuga o daño sin cerrar que aún no se escaló. */
export function puedeEscalar(
  caso: Pick<CasoServicio, "tipo" | "estatus" | "mantenimientoId">,
): boolean {
  return (
    TIPOS_ESCALABLES.includes(caso.tipo) &&
    caso.mantenimientoId === undefined &&
    caso.estatus !== "CERRADO"
  );
}

// --- estadística ---------------------------------------------------------------

/** Indicadores comunes a la estadística por cliente y a los KPIs globales. */
export interface ResumenCasos {
  total: number;
  abiertos: number;
  fueraDeTiempo: number;
  /** Fracción (0-1) de primera respuesta en tiempo; `null` si no hay casos que medir. */
  fraccionEnTiempo: number | null;
  horasPrimeraRespuesta: number | null;
  horasResolucion: number | null;
  calificacionPromedio: number | null;
}

function promedio(valores: readonly number[]): number | null {
  return valores.length === 0
    ? null
    : valores.reduce((s, v) => s + v, 0) / valores.length;
}

/**
 * El % en tiempo cuenta los respondidos en tiempo sobre los respondidos más
 * los sin responder que ya están fuera de tiempo (los que aún pueden cumplir
 * no cuentan).
 */
function resumirCasos(casos: readonly CasoServicio[], ahora: string): ResumenCasos {
  let respondidosEnTiempo = 0;
  let medidos = 0;
  let fueraDeTiempo = 0;
  for (const caso of casos) {
    const meta = estadoMeta(caso, ahora);
    if (meta === "FUERA_DE_TIEMPO") fueraDeTiempo += 1;
    if (caso.primeraRespuestaEl !== undefined) {
      medidos += 1;
      if (meta === "EN_TIEMPO") respondidosEnTiempo += 1;
    } else if (meta === "FUERA_DE_TIEMPO") {
      medidos += 1;
    }
  }
  return {
    total: casos.length,
    abiertos: casos.filter(casoAbierto).length,
    fueraDeTiempo,
    fraccionEnTiempo: medidos === 0 ? null : respondidosEnTiempo / medidos,
    horasPrimeraRespuesta: promedio(
      casos.flatMap((c) => {
        const horas = horasPrimeraRespuesta(c);
        return horas === undefined ? [] : [horas];
      }),
    ),
    horasResolucion: promedio(
      casos.flatMap((c) =>
        c.resueltoEl === undefined ? [] : [horasEntre(c.abiertoEl, c.resueltoEl)],
      ),
    ),
    calificacionPromedio: promedio(
      casos.flatMap((c) => (c.calificacion === undefined ? [] : [c.calificacion])),
    ),
  };
}

/** Tipo con más casos; a igual número, el primero del catálogo. */
function tipoMasFrecuente(casos: readonly CasoServicio[]): TipoCaso | null {
  let mejor: TipoCaso | null = null;
  let maximo = 0;
  for (const tipo of TIPOS_CASO) {
    const n = casos.filter((c) => c.tipo === tipo).length;
    if (n > maximo) {
      mejor = tipo;
      maximo = n;
    }
  }
  return mejor;
}

export interface EstadisticaCliente extends ResumenCasos {
  locatarioId: string;
  tipoFrecuente: TipoCaso | null;
}

/** Estadística de casos por locatario, del que más casos tiene al que menos. */
export function estadisticaPorCliente(
  casos: readonly CasoServicio[],
  ahora: string,
): EstadisticaCliente[] {
  const porLocatario = new Map<string, CasoServicio[]>();
  for (const caso of casos) {
    porLocatario.set(caso.locatarioId, [
      ...(porLocatario.get(caso.locatarioId) ?? []),
      caso,
    ]);
  }
  return [...porLocatario.entries()]
    .map(([locatarioId, propios]) => ({
      locatarioId,
      ...resumirCasos(propios, ahora),
      tipoFrecuente: tipoMasFrecuente(propios),
    }))
    .sort((a, b) => b.total - a.total || a.locatarioId.localeCompare(b.locatarioId));
}

export interface KpisCasos {
  /** Casos recibidos en la ventana. */
  recibidos: number;
  abiertos: number;
  fueraDeTiempo: number;
  fraccionEnTiempo: number | null;
  horasPrimeraRespuesta: number | null;
  calificacionPromedio: number | null;
}

/** KPIs globales de los casos recibidos en los últimos 30 días hasta `ahora`. */
export function kpisCasos(casos: readonly CasoServicio[], ahora: string): KpisCasos {
  const recientes = casos.filter((c) => {
    const horas = horasEntre(c.abiertoEl, ahora);
    return horas >= 0 && horas <= HORAS_VENTANA_KPIS;
  });
  const r = resumirCasos(recientes, ahora);
  return {
    recibidos: r.total,
    abiertos: r.abiertos,
    fueraDeTiempo: r.fueraDeTiempo,
    fraccionEnTiempo: r.fraccionEnTiempo,
    horasPrimeraRespuesta: r.horasPrimeraRespuesta,
    calificacionPromedio: r.calificacionPromedio,
  };
}
