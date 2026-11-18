import { IDS_VENDEDORES } from "@/config/usuarios";
import {
  calcularComisiones,
  cotizacionRequirioExcepcion,
  diasEntre,
  mesesCobrados,
  mesesDeContrato,
  sumarDias,
  DEMO_TODAY,
  ESQUEMA_INICIAL,
  type AtribucionContratos,
  type Comision,
  type Contrato,
  type ExcepcionPrecio,
} from "@/domain";
import { crearPrng } from "./prng";

/** PRNG propio de las comisiones: no altera la secuencia del resto de la semilla. */
export const SEMILLA_COMISIONES = 9_101;
/** Probabilidad de que una comisión histórica ya se haya pagado. */
const PROBABILIDAD_PAGADA = 0.6;
/** Días que tarda en pagarse una comisión, como máximo. */
const DIAS_MAX_PAGO = 45;

/**
 * Comisiones históricas de los contratos atribuidos: se calculan con el esquema
 * inicial como si se hubieran generado el día de inicio de cada contrato. Esos
 * contratos no tienen cotización en el seed (ni los `COT-HIST-*`), así que los
 * meses salen del propio contrato con gracia 0 y el vendedor, de la atribución
 * demo. Una parte de los contratos ya tiene sus comisiones pagadas, entre su
 * generación y `DEMO_TODAY`.
 */
export function crearComisiones(
  contratos: readonly Contrato[],
  atribucion: AtribucionContratos,
  excepciones: readonly ExcepcionPrecio[],
): Comision[] {
  const rng = crearPrng(SEMILLA_COMISIONES);
  return contratos.flatMap((contrato) => {
    const atribuido = atribucion[contrato.id];
    if (!atribuido) return [];
    const generadas = calcularComisiones(
      contrato,
      ESQUEMA_INICIAL,
      {
        vendedorId: atribuido.vendedorId,
        vendedorComercial: IDS_VENDEDORES.includes(atribuido.vendedorId),
        requirioExcepcion: cotizacionRequirioExcepcion(contrato.cotizacionId, excepciones),
        mesesCobrados: mesesCobrados(mesesDeContrato(contrato)),
      },
      `${contrato.inicio}T00:00:00`,
    );
    // Las comisiones de un contrato se pagan juntas, en la misma corrida.
    const transcurridos = diasEntre(contrato.inicio, DEMO_TODAY);
    if (transcurridos < 0 || !rng.prob(PROBABILIDAD_PAGADA)) return generadas;
    const pagadaEl = sumarDias(
      contrato.inicio,
      rng.entero(0, Math.min(transcurridos, DIAS_MAX_PAGO)),
    );
    return generadas.map((comision) => ({ ...comision, pagadaEl }));
  });
}
