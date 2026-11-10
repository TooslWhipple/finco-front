import { diasAtraso } from "./cobranza";
import { diasEntre, sumarDias } from "./fechas";
import type {
  CanalAviso,
  DiaSemana,
  DisparadorAviso,
  EnvioAviso,
  Factura,
  FechaISO,
  ProgramacionAvisos,
} from "./tipos";

/** Días de la semana en el orden en que se muestran (lunes primero). */
export const DIAS_SEMANA: readonly { valor: DiaSemana; corto: string; largo: string }[] =
  [
    { valor: "LUN", corto: "L", largo: "lunes" },
    { valor: "MAR", corto: "M", largo: "martes" },
    { valor: "MIE", corto: "X", largo: "miércoles" },
    { valor: "JUE", corto: "J", largo: "jueves" },
    { valor: "VIE", corto: "V", largo: "viernes" },
    { valor: "SAB", corto: "S", largo: "sábado" },
    { valor: "DOM", corto: "D", largo: "domingo" },
  ];

/** Disparadores en el orden del ciclo de la factura. */
export const DISPARADORES: readonly DisparadorAviso[] = [
  "ANTES_3",
  "DIA_PAGO",
  "ATRASO_5",
  "ATRASO_15",
  "ATRASO_30",
];

/** Id estable de la plantilla de un disparador y un canal. */
export function idPlantilla(disparador: DisparadorAviso, canal: CanalAviso): string {
  return `pl-${disparador.toLowerCase()}-${canal.toLowerCase()}`;
}

const ATRASO_POR_DISPARADOR = { ATRASO_5: 5, ATRASO_15: 15, ATRASO_30: 30 } as const;

/** Día de la semana de una fecha. */
export function diaSemanaDe(fecha: FechaISO): DiaSemana {
  const [a, m, d] = fecha.split("-").map(Number);
  const indice = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return DIAS_SEMANA[(indice + 6) % 7].valor;
}

/** Disparador que toca hoy a una factura (3 días antes, el día de pago, 5, 15 y 30 de atraso). */
export function disparadorDeFactura(
  factura: Factura,
  hoy: FechaISO,
): DisparadorAviso | null {
  if (factura.pagadaEl) return null;
  const faltan = diasEntre(hoy, factura.vencimiento);
  if (faltan === 3) return "ANTES_3";
  if (faltan === 0) return "DIA_PAGO";
  const atraso = diasAtraso(factura, hoy);
  for (const [disparador, dias] of Object.entries(ATRASO_POR_DISPARADOR)) {
    if (atraso === dias) return disparador as DisparadorAviso;
  }
  return null;
}

/** Plantilla que corresponde a un aviso manual: la del escalón de atraso más cercano. */
export function disparadorManual(factura: Factura, hoy: FechaISO): DisparadorAviso {
  const propio = disparadorDeFactura(factura, hoy);
  if (propio) return propio;
  const atraso = diasAtraso(factura, hoy);
  if (atraso >= 30) return "ATRASO_30";
  if (atraso >= 15) return "ATRASO_15";
  return "ATRASO_5";
}

export interface AvisoDelDia {
  factura: Factura;
  disparador: DisparadorAviso;
  canal: CanalAviso;
}

/**
 * Avisos que salen un día: las facturas que cumplen un disparador. Tres de cada
 * cuatro van por WhatsApp y el resto, los últimos, por correo.
 */
export function avisosDelDia(facturas: Factura[], hoy: FechaISO): AvisoDelDia[] {
  const toca = facturas.flatMap((factura) => {
    const disparador = disparadorDeFactura(factura, hoy);
    return disparador ? [{ factura, disparador }] : [];
  });
  const correos = Math.floor(toca.length / 4);
  return toca.map((aviso, i) => ({
    ...aviso,
    canal: i >= toca.length - correos ? "CORREO" : "WHATSAPP",
  }));
}

/** Avisos del día que aún no tienen envío registrado ese día. */
export function avisosParaEnviar(
  facturas: Factura[],
  hoy: FechaISO,
  envios: readonly EnvioAviso[],
): AvisoDelDia[] {
  const yaHoy = new Set(
    envios.filter((e) => e.enviadoEl === hoy).map((e) => e.facturaId),
  );
  return avisosDelDia(facturas, hoy).filter((a) => !yaHoy.has(a.factura.id));
}

export interface Ejecucion {
  fecha: FechaISO;
  hora: string;
}

/**
 * Siguiente corrida programada estrictamente posterior a `ahora`; `null` si la
 * programación está apagada o sin días.
 */
export function proximaEjecucion(
  programacion: ProgramacionAvisos,
  ahora: Ejecucion,
): Ejecucion | null {
  if (!programacion.activa || programacion.dias.length === 0) return null;
  for (let i = 0; i <= 7; i++) {
    const fecha = sumarDias(ahora.fecha, i);
    if (!programacion.dias.includes(diaSemanaDe(fecha))) continue;
    if (i === 0 && programacion.hora <= ahora.hora) continue;
    return { fecha, hora: programacion.hora };
  }
  return null;
}
