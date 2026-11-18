import { redondearCentavos } from "./numeros";
import type {
  Comision,
  ConceptoComision,
  Contrato,
  EsquemaComisiones,
  ExcepcionPrecio,
} from "./tipos";

/**
 * Comisiones comerciales que genera la firma de un contrato. El dominio no
 * resuelve quién vendió ni si el vendedor es del equipo comercial: el llamador
 * (store o seed) le pasa esos datos ya resueltos, y también el `ahora`.
 */

/** Esquema de ejemplo hasta que llegue el Excel de Finco. */
export const ESQUEMA_INICIAL: Readonly<EsquemaComisiones> = {
  asesorPct: 4,
  bonoSinExcepcionPct: 1,
  mandoMedioPct: 1,
  mandosMedios: ["usr-jorge"],
};

/** Meses del primer año que pagan renta: `max(0, min(12, plazo) − gracia)`. */
export function mesesCobrados(plazoMeses: number, mesesGracia = 0): number {
  return Math.max(0, Math.min(12, plazoMeses) - mesesGracia);
}

/**
 * ¿La cotización necesitó una excepción de precio? Solo cuenta una que llegó a
 * aplicarse: una pendiente o rechazada no cambió el precio pactado.
 */
export function cotizacionRequirioExcepcion(
  cotizacionId: string | undefined,
  excepciones: readonly Pick<ExcepcionPrecio, "cotizacionId" | "estado">[],
): boolean {
  if (cotizacionId === undefined) return false;
  return excepciones.some(
    (e) => e.cotizacionId === cotizacionId && e.estado === "APLICADA",
  );
}

/** Datos del cierre que el llamador resuelve antes de calcular. */
export interface CierreComisionable {
  /** `Usuario.id` de quien cerró el contrato. */
  vendedorId: string;
  /** ¿El vendedor es del equipo comercial? Si no, el contrato no comisiona. */
  vendedorComercial: boolean;
  /** ¿La cotización requirió una excepción de precio aplicada? */
  requirioExcepcion: boolean;
  /** Meses cobrados del primer año (ver `mesesCobrados`). */
  mesesCobrados: number;
}

/** Id determinista: la misma firma no duplica comisiones. */
export function idComision(
  contratoId: string,
  concepto: ConceptoComision,
  usuarioId: string,
): string {
  return `com-${contratoId}-${concepto}-${usuarioId}`;
}

/**
 * Comisiones de un contrato recién firmado con el esquema vigente. Cada una es
 * una foto fija de base, porcentaje y monto. Un concepto cuyo monto sale en 0
 * (porcentaje 0 o sin meses cobrados) no se genera: no hay nada que pagar.
 */
export function calcularComisiones(
  contrato: Pick<Contrato, "id" | "rentaMensual">,
  esquema: EsquemaComisiones,
  cierre: CierreComisionable,
  ahora: string,
): Comision[] {
  if (!cierre.vendedorComercial) return [];
  const base = redondearCentavos(contrato.rentaMensual * cierre.mesesCobrados);
  const generadaEl = ahora.slice(0, 10);
  const comisiones: Comision[] = [];
  const agregar = (concepto: ConceptoComision, usuarioId: string, porcentaje: number) => {
    const monto = redondearCentavos((base * porcentaje) / 100);
    if (monto <= 0) return;
    comisiones.push({
      id: idComision(contrato.id, concepto, usuarioId),
      contratoId: contrato.id,
      usuarioId,
      concepto,
      base,
      porcentaje,
      monto,
      generadaEl,
    });
  };

  agregar("ASESOR", cierre.vendedorId, esquema.asesorPct);
  if (!cierre.requirioExcepcion) {
    agregar("BONO_SIN_EXCEPCION", cierre.vendedorId, esquema.bonoSinExcepcionPct);
  }
  for (const mandoId of new Set(esquema.mandosMedios)) {
    if (mandoId !== cierre.vendedorId) {
      agregar("MANDO_MEDIO", mandoId, esquema.mandoMedioPct);
    }
  }
  return comisiones;
}

/** Totales de un conjunto de comisiones, en MXN. */
export interface TotalesComisiones {
  generado: number;
  pagado: number;
  pendiente: number;
}

/** Generado, pagado y pendiente de un conjunto de comisiones. */
export function totalesComisiones(
  comisiones: readonly Pick<Comision, "monto" | "pagadaEl">[],
): TotalesComisiones {
  let generado = 0;
  let pagado = 0;
  for (const c of comisiones) {
    generado += c.monto;
    if (c.pagadaEl !== undefined) pagado += c.monto;
  }
  return {
    generado: redondearCentavos(generado),
    pagado: redondearCentavos(pagado),
    pendiente: redondearCentavos(generado - pagado),
  };
}

/** Renglón del estado de cuenta: lo que cada usuario lleva generado, pagado y pendiente. */
export interface EstadoCuentaComisiones extends TotalesComisiones {
  usuarioId: string;
}

/** Estado de cuenta por usuario, en el orden en que aparece cada uno. */
export function estadoDeCuenta(comisiones: readonly Comision[]): EstadoCuentaComisiones[] {
  const porUsuario = new Map<string, Comision[]>();
  for (const c of comisiones) {
    const lista = porUsuario.get(c.usuarioId);
    if (lista) lista.push(c);
    else porUsuario.set(c.usuarioId, [c]);
  }
  return [...porUsuario].map(([usuarioId, propias]) => ({
    usuarioId,
    ...totalesComisiones(propias),
  }));
}
