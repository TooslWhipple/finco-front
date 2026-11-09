import type { Contrato, ExcepcionPrecio, FechaISO } from "@/domain";
import type { Contexto } from "./cartera";
import { crearPrng } from "./prng";

/** Factor del mínimo en la plaza héroe: conserva el 94.5 % que se ensayó en la demo. */
export const FACTOR_MINIMO_HEROE = 0.945;

/** Personas que firman las excepciones históricas (usuarios demo). */
const SOLICITANTE = "Jorge Ramírez";
const AUTORIZA = "Mariana López";
const APLICA = "Ricardo Salas";

const MOTIVOS_HISTORICOS = [
  "Giro nuevo para el mix de la plaza; el cliente firma a largo plazo con aval.",
  "Cierre contra una plaza de la competencia; se pidió un ajuste a cambio de más plazo.",
  "Local con baja demanda en el pasillo; se prefirió ocuparlo que mantenerlo vacío.",
  "Locatario ancla del giro, atrae tráfico al resto de la plaza.",
];

/** Semilla estable por texto (FNV-1a), para no consumir el generador principal. */
function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mínimo de la plaza entre el 85 % y el 97 % de la lista, estable por plaza. */
export function factorMinimoPlaza(plazaId: string): number {
  return crearPrng(semillaDe(`min:${plazaId}`)).entero(85, 97) / 100;
}

/**
 * Renta del modelo financiero de la PMO: entre el 98 % y el 105 % del mínimo
 * autorizado de origen (la referencia con la que se planeó el ingreso).
 */
export function rentaPlaneadaLocal(localId: string, minimo: number): number {
  const factor = crearPrng(semillaDe(`plan:${localId}`)).entero(980, 1050) / 1000;
  return Math.round((minimo * factor) / 10) * 10;
}

export interface RentaContratada {
  renta: number;
  /** `true` si la renta quedó bajo el mínimo y requiere una excepción histórica. */
  bajoMinimo: boolean;
}

/**
 * Renta contratada de un local ocupado, repartida de forma determinista:
 * ~40 % en el mínimo, ~35 % entre +3 % y +8 %, ~15 % entre +10 % y +18 % y
 * ~10 % bajo el mínimo (con excepción histórica).
 */
export function rentaContratadaLocal(localId: string, minimo: number): RentaContratada {
  const rng = crearPrng(semillaDe(`renta:${localId}`));
  const sorteo = rng.siguiente();
  const redondear = (valor: number) => Math.round(valor / 10) * 10;
  if (sorteo < 0.4) return { renta: minimo, bajoMinimo: false };
  if (sorteo < 0.75) {
    return { renta: redondear(minimo * (1 + rng.entero(3, 8) / 100)), bajoMinimo: false };
  }
  if (sorteo < 0.9) {
    return {
      renta: redondear(minimo * (1 + rng.entero(10, 18) / 100)),
      bajoMinimo: false,
    };
  }
  return { renta: redondear(minimo * (1 - rng.entero(2, 7) / 100)), bajoMinimo: true };
}

/** Excepción histórica ya APLICADA que respalda un contrato firmado bajo el mínimo. */
function excepcionHistorica(
  numero: number,
  contrato: Contrato,
  minimo: number,
): ExcepcionPrecio {
  const folio = String(numero).padStart(4, "0");
  const solicitada: FechaISO = contrato.inicio;
  return {
    id: `EXC-HIST-${folio}`,
    cotizacionId: `COT-HIST-${folio}`,
    localId: contrato.localId,
    rentaSolicitada: contrato.rentaMensual,
    precioMinimo: minimo,
    estado: "APLICADA",
    solicitadaPor: SOLICITANTE,
    solicitadaEn: solicitada,
    motivo: MOTIVOS_HISTORICOS[numero % MOTIVOS_HISTORICOS.length],
    autorizadaPor: AUTORIZA,
    autorizadaEn: solicitada,
    comentarioDireccion: "Autorizada: el plazo compensa la diferencia contra el mínimo.",
    aplicadaPor: APLICA,
    aplicadaEn: solicitada,
    comentarioPmo: "Aplicada a la operación; el mínimo del local no cambia.",
  };
}

/**
 * Si el contrato quedó bajo el mínimo, lo liga a una cotización histórica y
 * devuelve la excepción APLICADA que lo respalda; si no, `undefined`.
 */
export function respaldarContrato(
  ctx: Contexto,
  contrato: Contrato,
  minimo: number,
): ExcepcionPrecio | undefined {
  if (contrato.rentaMensual >= minimo) return undefined;
  ctx.excepciones += 1;
  const excepcion = excepcionHistorica(ctx.excepciones, contrato, minimo);
  contrato.cotizacionId = excepcion.cotizacionId;
  return excepcion;
}
