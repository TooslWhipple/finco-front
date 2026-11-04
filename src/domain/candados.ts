import { diasEntre } from "./fechas";
import type { Candado, Cotizacion, ExcepcionPrecio, Local } from "./tipos";

/** Horas que se aparta un local para el prospecto en cotización. */
export const HORAS_APARTADO = 72;
/** Tope de plazo aceptado en formularios (no es un candado). */
export const PLAZO_MAX_MESES = 60;

/**
 * Evalúa los 5 candados de una cotización. Una excepción de precio aprobada
 * convierte el candado de precio mínimo en `EXCEPCION` (pasa).
 */
export function evaluarCandados(
  cotizacion: Cotizacion,
  local: Local,
  hoy: string,
  excepcion?: ExcepcionPrecio,
): Candado[] {
  const excepcionAprobada = excepcion?.estado === "APROBADA";
  const bajoMinimo = cotizacion.rentaMensual < local.precioMinimo;

  const precio: Candado = !bajoMinimo
    ? {
        id: "PRECIO_MINIMO",
        nombre: "Renta ≥ precio mínimo autorizado",
        estado: "CUMPLE",
        detalle: "La renta cumple el mínimo autorizado.",
      }
    : excepcionAprobada
      ? {
          id: "PRECIO_MINIMO",
          nombre: "Renta ≥ precio mínimo autorizado",
          estado: "EXCEPCION",
          detalle: "Renta bajo el mínimo con excepción aprobada.",
        }
      : {
          id: "PRECIO_MINIMO",
          nombre: "Renta ≥ precio mínimo autorizado",
          estado: "FALLA",
          detalle: "La renta está bajo el mínimo autorizado.",
        };

  const disponible = local.estatus === "DISPONIBLE" || local.estatus === "EN_COTIZACION";
  const vigente = diasEntre(hoy, cotizacion.vigenteHasta) >= 0;
  const aval = cotizacion.prospecto.aval;
  const expedienteCompleto = cotizacion.prospecto.documentosCompletos;

  return [
    {
      id: "COTIZACION_OFICIAL",
      nombre: "Cotización oficial generada en el sistema",
      estado: vigente ? "CUMPLE" : "FALLA",
      detalle: vigente
        ? `${cotizacion.id} vigente hasta ${cotizacion.vigenteHasta}.`
        : `${cotizacion.id} venció el ${cotizacion.vigenteHasta}.`,
    },
    precio,
    {
      id: "DISPONIBILIDAD",
      nombre: "Local disponible y sin otro apartado",
      estado: disponible ? "CUMPLE" : "FALLA",
      detalle: disponible
        ? local.estatus === "EN_COTIZACION"
          ? `${local.codigo} apartado ${HORAS_APARTADO} h para este prospecto.`
          : `${local.codigo} libre, sin otro apartado.`
        : "El local ya no está disponible.",
    },
    {
      id: "EXPEDIENTE",
      nombre: "Expediente del prospecto completo",
      estado: expedienteCompleto ? "CUMPLE" : "FALLA",
      detalle: expedienteCompleto
        ? "Acta, RFC, identificación, comprobante."
        : "Faltan documentos del prospecto (acta, RFC, identificación, comprobante).",
    },
    {
      id: "AVAL",
      nombre: "Aval / fianza registrada",
      estado: aval ? "CUMPLE" : "FALLA",
      detalle: aval ?? "No hay aval ni fianza registrada.",
    },
  ];
}

/** "Generar contrato" se habilita solo si ningún candado falla. */
export function contratoDesbloqueado(candados: Candado[]): boolean {
  return candados.every((c) => c.estado !== "FALLA");
}
