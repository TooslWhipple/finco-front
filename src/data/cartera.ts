import {
  DEMO_TODAY,
  diasAtraso,
  estatusCobro,
  sumarDias,
  sumarMeses,
  type Contrato,
  type Factura,
  type FechaISO,
  type Locatario,
} from "@/domain";
import { GIROS, MARCAS } from "./catalogo";
import type { Prng } from "./prng";

/** Contadores para ids y folios estables mientras se arma el seed. */
export interface Contexto {
  locatarios: number;
  contratos: number;
  facturas: number;
  nombresUsados: Set<string>;
}

export function crearContexto(): Contexto {
  return { locatarios: 0, contratos: 0, facturas: 0, nombresUsados: new Set() };
}

const FOLIO_BASE = 3000;

export function diaDe(fecha: FechaISO): number {
  return Number(fecha.slice(8, 10));
}

/** Locatario ficticio con nombre único dentro del seed. */
export function crearLocatario(
  ctx: Contexto,
  rng: Prng,
  nombre?: string,
  giro?: string,
): Locatario {
  const giroFinal = giro ?? rng.elegir(GIROS);
  let nombreFinal = nombre;
  if (!nombreFinal) {
    const base = `${giroFinal} ${rng.elegir(MARCAS)}`;
    nombreFinal = base;
    // Giro × marca da ~480 combinaciones: al agotarlas se numera la sucursal.
    for (let sucursal = 2; ctx.nombresUsados.has(nombreFinal); sucursal++) {
      nombreFinal = `${base} ${sucursal}`;
    }
  }
  ctx.nombresUsados.add(nombreFinal);
  ctx.locatarios += 1;
  return {
    id: `loc-${String(ctx.locatarios).padStart(4, "0")}`,
    nombre: nombreFinal,
    giro: giroFinal,
  };
}

interface DatosContrato {
  localId: string;
  locatarioId: string;
  rentaMensual: number;
}

function ensamblarContrato(
  ctx: Contexto,
  datos: DatosContrato,
  inicio: FechaISO,
  fin: FechaISO,
): Contrato {
  ctx.contratos += 1;
  return {
    id: `ctr-${String(ctx.contratos).padStart(4, "0")}`,
    ...datos,
    inicio,
    fin,
    estado: "VIGENTE",
  };
}

/** Contrato que termina en `fin` (último día de vigencia) con el plazo dado. */
export function contratoPorFin(
  ctx: Contexto,
  datos: DatosContrato,
  fin: FechaISO,
  plazoMeses: number,
): Contrato {
  const inicio = sumarDias(sumarMeses(fin, -plazoMeses), 1);
  return ensamblarContrato(ctx, datos, inicio, fin);
}

/** Contrato que arranca en `inicio` con el plazo dado. */
export function contratoPorInicio(
  ctx: Contexto,
  datos: DatosContrato,
  inicio: FechaISO,
  plazoMeses: number,
): Contrato {
  const fin = sumarDias(sumarMeses(inicio, plazoMeses), -1);
  return ensamblarContrato(ctx, datos, inicio, fin);
}

/** Seguimiento de cobranza coherente con el estatus de la factura. */
export function seguimientoInicial(
  factura: Factura,
  hoy: FechaISO,
  variante: number,
): string {
  const estatus = estatusCobro(factura, hoy);
  if (estatus === "PAGADA") {
    if (variante % 3 === 2) return "Conciliado EnKontrol";
    const dia = String(diaDe(factura.pagadaEl ?? hoy)).padStart(2, "0");
    return `${variante % 3 === 0 ? "SPEI" : "Depósito"} ${dia} nov`;
  }
  if (estatus === "VIGENTE") {
    return "Aviso previo enviado";
  }
  const dias = diasAtraso(factura, hoy);
  if (dias <= 10) return variante % 2 === 0 ? "2.º aviso WhatsApp" : "2.º aviso correo";
  if (dias <= 30) return "Llamada agendada";
  if (dias <= 75) return "Convenio propuesto";
  return "Escalado a jurídico";
}

/**
 * Factura del corte de noviembre para un contrato. Con `atrasoDias` la factura
 * quedó sin pagar y venció hace esos días; sin él vence el día de aniversario
 * de noviembre y puede estar pagada por adelantado.
 */
export function crearFactura(
  ctx: Contexto,
  rng: Prng,
  contrato: Contrato,
  atrasoDias?: number,
): Factura {
  ctx.facturas += 1;
  const n = ctx.facturas;
  const base = {
    id: `fac-${String(n).padStart(4, "0")}`,
    localId: contrato.localId,
    locatarioId: contrato.locatarioId,
    monto: contrato.rentaMensual,
    folio: `A-${FOLIO_BASE + n}`,
  };
  let factura: Factura;
  if (atrasoDias !== undefined) {
    const vencimiento = sumarDias(DEMO_TODAY, -atrasoDias);
    factura = { ...base, mes: vencimiento.slice(0, 7), vencimiento };
  } else {
    const dia = Math.min(diaDe(contrato.inicio), 28);
    const vencimiento = `2026-11-${String(dia).padStart(2, "0")}`;
    const pagada = dia <= 2 || rng.prob(0.66);
    const pagadaEl = pagada
      ? dia <= 2
        ? vencimiento
        : `2026-11-0${rng.entero(1, Math.min(dia, 3))}`
      : undefined;
    factura = { ...base, mes: "2026-11", vencimiento, pagadaEl };
  }
  return { ...factura, seguimiento: seguimientoInicial(factura, DEMO_TODAY, n) };
}

/** Precio mínimo autorizado de referencia: ~94.5 % de la lista, a múltiplos de $50. */
export function minimoAutorizado(precioLista: number): number {
  return Math.round((precioLista * 0.945) / 50) * 50;
}
