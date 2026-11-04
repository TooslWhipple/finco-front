import {
  DEMO_TODAY,
  folioContrato,
  type Candado,
  type Cotizacion,
  type ExcepcionPrecio,
  type FechaISO,
  type Local,
} from "@/domain";

/** Condiciones económicas editables de una cotización. */
export interface Terminos {
  rentaMensual: number;
  plazoMeses: number;
  depositoMeses: number;
  mesesGracia: number;
  inicioContrato: FechaISO;
}

export const DEPOSITO_POR_OMISION = 1;
export const GRACIA_POR_OMISION = 0;

/** Términos de una cotización, con los valores por omisión de las que no los traen. */
export function terminosDe(cotizacion: Cotizacion): Terminos {
  return {
    rentaMensual: cotizacion.rentaMensual,
    plazoMeses: cotizacion.plazoMeses,
    depositoMeses: cotizacion.depositoMeses ?? DEPOSITO_POR_OMISION,
    mesesGracia: cotizacion.mesesGracia ?? GRACIA_POR_OMISION,
    inicioContrato: cotizacion.inicioContrato ?? cotizacion.emitidaEl,
  };
}

export function aplicarTerminos(cotizacion: Cotizacion, terminos: Terminos): Cotizacion {
  return { ...cotizacion, ...terminos };
}

export interface ResumenEconomico {
  /** Renta por todo el plazo, antes de incrementos anuales. */
  valorTotal: number;
  /** Depósito más la primera renta (cero si hay gracia). */
  primerPago: number;
  /** Renta menos el precio mínimo autorizado; negativa = bajo el mínimo. */
  diferenciaMinimo: number;
  /** Diferencia contra el mínimo acumulada en todo el plazo. */
  diferenciaVigencia: number;
}

export function resumenEconomico(
  terminos: Terminos,
  local: Pick<Local, "precioMinimo">,
): ResumenEconomico {
  const { rentaMensual, plazoMeses, depositoMeses, mesesGracia } = terminos;
  const primeraRenta = mesesGracia > 0 ? 0 : rentaMensual;
  return {
    valorTotal: rentaMensual * plazoMeses,
    primerPago: primeraRenta + rentaMensual * depositoMeses,
    diferenciaMinimo: rentaMensual - local.precioMinimo,
    diferenciaVigencia: (rentaMensual - local.precioMinimo) * plazoMeses,
  };
}

/** Siguiente folio libre `COT-AAAA-NNNN` según las cotizaciones vivas. */
export function siguienteFolio(
  cotizaciones: readonly Pick<Cotizacion, "id">[],
  hoy: FechaISO = DEMO_TODAY,
): string {
  const numeros = cotizaciones.map((c) => Number(c.id.split("-")[2]) || 0);
  const siguiente = Math.max(0, ...numeros) + 1;
  return `COT-${hoy.slice(0, 4)}-${String(siguiente).padStart(4, "0")}`;
}

/**
 * Excepción que cubre la renta actual: la más reciente de la cotización cuya
 * renta solicitada no supera la renta que se está cotizando. Si Ventas baja la
 * renta por debajo de lo aprobado, la excepción deja de cubrirla.
 */
export function excepcionVigente(
  excepciones: readonly ExcepcionPrecio[],
  cotizacionId: string,
  rentaMensual: number,
): ExcepcionPrecio | undefined {
  return excepciones
    .filter((e) => e.cotizacionId === cotizacionId && e.rentaSolicitada <= rentaMensual)
    .at(-1);
}

export function excepcionPendiente(
  excepciones: readonly ExcepcionPrecio[],
  cotizacionId: string,
): ExcepcionPrecio | undefined {
  return excepciones.find(
    (e) => e.cotizacionId === cotizacionId && e.estado === "PENDIENTE",
  );
}

export type EstadoPaso = "HECHO" | "ACTUAL" | "PENDIENTE";

export interface PasoCotizacion {
  numero: number;
  titulo: string;
  estado: EstadoPaso;
  nota?: string;
  /** Destino de la nota cuando el paso enlaza a otra pantalla. */
  href?: string;
}

/** Los 5 pasos del flujo, derivados del estado real de la cotización. */
export function derivarPasos(entrada: {
  prospecto: string;
  /** Ficha del prospecto, si está dado de alta en el embudo. */
  prospectoHref?: string;
  folioCotizacion: string;
  candados: readonly Candado[];
  excepcion?: ExcepcionPrecio;
  contratoGenerado: boolean;
  folioContrato: string;
}): PasoCotizacion[] {
  const { candados, excepcion, contratoGenerado } = entrada;
  const pendientes = candados.filter((c) => c.estado === "FALLA").length;
  const enEspera = excepcion?.estado === "PENDIENTE";

  // Índice (1-5) del paso en curso: los candados sin resolver retienen el flujo.
  const actual = contratoGenerado ? 4 : enEspera || pendientes > 0 ? 3 : 4;

  const notaCandados = enEspera
    ? "En espera de Superadmin"
    : pendientes > 0
      ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`
      : "Todos cumplen";

  const base: Omit<PasoCotizacion, "estado">[] = [
    {
      numero: 1,
      titulo: "Prospecto",
      nota: entrada.prospecto,
      href: entrada.prospectoHref,
    },
    { numero: 2, titulo: "Cotización oficial", nota: entrada.folioCotizacion },
    { numero: 3, titulo: "Validación de candados", nota: notaCandados },
    {
      numero: 4,
      titulo: "Contrato",
      nota: contratoGenerado
        ? `Borrador ${entrada.folioContrato}`
        : actual === 4
          ? "Listo para generar"
          : "Borrador",
    },
    { numero: 5, titulo: "Firma y alta", nota: "EnKontrol" },
  ];

  return base.map((paso) => ({
    ...paso,
    estado:
      paso.numero < actual ? "HECHO" : paso.numero === actual ? "ACTUAL" : "PENDIENTE",
  }));
}

export interface EventoActividad {
  id: string;
  titulo: string;
  detalle?: string;
  fecha?: FechaISO;
  /** Hora "HH:MM", si se conoce. */
  hora?: string;
  tono: "verde" | "naranja" | "coral" | "indigo" | "primario";
}

/** Historia de la cotización (de más antigua a más reciente) armada con lo que consta en el estado. */
export function construirActividad(
  cotizacion: Cotizacion,
  excepciones: readonly ExcepcionPrecio[],
): EventoActividad[] {
  const eventos: EventoActividad[] = cotizacion.actividad?.length
    ? cotizacion.actividad.map((e) => ({ ...e, tono: "indigo" }))
    : [
        {
          id: "emitida",
          titulo: "Cotización emitida",
          detalle: `Prospecto: ${cotizacion.prospecto.nombre}`,
          fecha: cotizacion.emitidaEl,
          tono: "indigo",
        },
      ];
  for (const e of excepciones.filter((x) => x.cotizacionId === cotizacion.id)) {
    eventos.push({
      id: `${e.id}-solicitada`,
      titulo: `Excepción de precio solicitada por ${e.solicitadaPor}`,
      detalle: e.motivo,
      fecha: DEMO_TODAY,
      tono: "naranja",
    });
    if (e.estado !== "PENDIENTE") {
      eventos.push({
        id: `${e.id}-resuelta`,
        titulo: `Excepción ${e.estado === "APROBADA" ? "aprobada" : "rechazada"}${
          e.resueltaPor ? ` por ${e.resueltaPor}` : ""
        }`,
        detalle: e.comentario,
        fecha: DEMO_TODAY,
        tono: e.estado === "APROBADA" ? "verde" : "coral",
      });
    }
  }
  if (cotizacion.estado === "CONTRATO_GENERADO") {
    eventos.push({
      id: "contrato",
      titulo: `Borrador de contrato ${folioContrato(cotizacion.id)} generado`,
      fecha: cotizacion.contratoGeneradoEl,
      tono: "verde",
    });
  }
  return eventos;
}
