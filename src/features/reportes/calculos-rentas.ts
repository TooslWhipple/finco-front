import {
  RANGOS_RENTA,
  cumplimientoPlan,
  diasEntre,
  rentaVsMinimo,
  rentasDeLocales,
  type Contrato,
  type ExcepcionPrecio,
  type Local,
  type Plaza,
  type RangoRenta,
} from "@/domain";
import { formatMoneda, formatNumero, formatPorcentaje } from "@/lib/format";
import type { DatosReporte, ResultadoReporte, TonoBarra } from "./tipos";

const ETIQUETA_RANGO: Record<RangoRenta, string> = {
  BAJO_MINIMO: "Bajo el mínimo",
  EN_MINIMO: "En el mínimo",
  HASTA_5: "+0 a 5%",
  HASTA_10: "+5 a 10%",
  MAS_10: "+10% o más",
};

const TONO_RANGO: Record<RangoRenta, TonoBarra> = {
  BAJO_MINIMO: "rojo",
  EN_MINIMO: "ambar",
  HASTA_5: "indigo",
  HASTA_10: "verde",
  MAS_10: "verde",
};

const DIAS_POR_MES = 30.4375;

const ETIQUETA_ESTADO: Record<ExcepcionPrecio["estado"], string> = {
  PENDIENTE: "Por autorizar",
  AUTORIZADA_DIRECCION: "Por aplicar",
  APLICADA: "Aplicada",
  RECHAZADA: "Rechazada",
};

/** Contrato vigente de cada local, por id de local. */
export function contratosVigentes(datos: DatosReporte): Map<string, Contrato> {
  const porLocal = new Map<string, Contrato>();
  for (const c of datos.contratos) {
    if (c.estado === "VIGENTE" && diasEntre(datos.hoy, c.fin) >= 0) {
      porLocal.set(c.localId, c);
    }
  }
  return porLocal;
}

/** Meses de un contrato, redondeados. */
function mesesDe(contrato: Pick<Contrato, "inicio" | "fin">): number {
  return Math.round(diasEntre(contrato.inicio, contrato.fin) / DIAS_POR_MES);
}

/** "Rentas vs mínimo por local": cuánto se rentó arriba (o abajo) del mínimo autorizado. */
export function reporteRentasVsMinimo(datos: DatosReporte): ResultadoReporte {
  const vigentes = contratosVigentes(datos);
  const plazaPorId = new Map(datos.plazas.map((p) => [p.id, p]));
  const locatarioPorId = new Map(datos.locatarios.map((l) => [l.id, l.nombre]));
  const excepcionPorCotizacion = new Map(
    datos.excepciones
      .filter((e) => e.estado === "APLICADA")
      .map((e) => [e.cotizacionId, e.id]),
  );

  const filas = datos.locales
    .flatMap((local) => {
      const contrato = vigentes.get(local.id);
      return contrato ? [{ local, contrato }] : [];
    })
    .map(({ local, contrato }) => {
      const comparacion = rentaVsMinimo(contrato.rentaMensual, local.precioMinimo);
      return {
        plazaId: local.plazaId,
        plaza: plazaPorId.get(local.plazaId)?.nombre ?? local.plazaId,
        local: local.codigo,
        locatario: locatarioPorId.get(contrato.locatarioId) ?? "—",
        renta: contrato.rentaMensual,
        minimo: local.precioMinimo,
        diferencia: comparacion.diferencia,
        diferenciaPct: comparacion.diferenciaPct / 100,
        excepcion: excepcionPorCotizacion.get(contrato.cotizacionId ?? "") ?? "—",
        rango: comparacion.rango,
      };
    })
    .toSorted((a, b) => a.plaza.localeCompare(b.plaza) || a.local.localeCompare(b.local));

  const extra = filas.reduce((s, f) => s + Math.max(0, f.diferencia), 0);
  const bajo = filas.filter((f) => f.rango === "BAJO_MINIMO").length;
  return {
    resumen:
      filas.length === 0
        ? "No hay locales rentados en este alcance."
        : `Ingreso extra sobre el mínimo: ${formatMoneda(extra)} al mes en ${formatNumero(filas.length)} locales rentados; ${formatNumero(bajo)} están bajo el mínimo con excepción aplicada.`,
    grafica: {
      serie: "Locales",
      formato: "numero",
      puntos: RANGOS_RENTA.map((rango) => ({
        etiqueta: ETIQUETA_RANGO[rango],
        valor: filas.filter((f) => f.rango === rango).length,
        tono: TONO_RANGO[rango],
      })),
    },
    tabla: {
      columnas: [
        { clave: "plaza", etiqueta: "Plaza" },
        { clave: "local", etiqueta: "Local" },
        { clave: "locatario", etiqueta: "Locatario" },
        { clave: "renta", etiqueta: "Renta contratada", formato: "moneda" },
        { clave: "minimo", etiqueta: "Mínimo autorizado", formato: "moneda" },
        { clave: "diferencia", etiqueta: "Diferencia ($)", formato: "moneda" },
        { clave: "diferenciaPct", etiqueta: "Diferencia (%)", formato: "porcentaje" },
        { clave: "excepcion", etiqueta: "Excepción" },
      ],
      filas,
    },
  };
}

/** Datos de una excepción listos para el reporte de trazabilidad. */
function filaExcepcion(
  e: ExcepcionPrecio,
  datos: DatosReporte,
  local: Local | undefined,
  plaza: Plaza | undefined,
) {
  const contrato = datos.contratos.find((c) => c.cotizacionId === e.cotizacionId);
  const cotizacion = datos.cotizaciones.find((c) => c.id === e.cotizacionId);
  const locatario = contrato
    ? datos.locatarios.find((l) => l.id === contrato.locatarioId)?.nombre
    : undefined;
  const plazo = cotizacion?.plazoMeses ?? (contrato ? mesesDe(contrato) : 0);
  const descuento = e.precioMinimo - e.rentaSolicitada;
  return {
    plazaId: plaza?.id ?? "",
    // El id de la excepción es interno; el usuario reconoce el folio de la cotización.
    folio: e.cotizacionId,
    plaza: plaza?.nombre ?? "—",
    local: local?.codigo ?? e.localId,
    cliente: locatario ?? cotizacion?.prospecto.nombre ?? "—",
    estado: ETIQUETA_ESTADO[e.estado],
    diferencia: -descuento,
    mensual: descuento,
    vida: descuento * plazo,
    solicito: e.solicitadaPor,
    autorizo: e.autorizadaPor ?? "—",
    aplico: e.aplicadaPor ?? "—",
    motivo: e.motivo ?? "—",
    fecha: e.aplicadaEn ?? e.rechazadaEn ?? e.autorizadaEn ?? e.solicitadaEn ?? "—",
  };
}

/** "Descuentos y excepciones": quién pidió cada descuento, a qué cliente y cuánto costó. */
export function reporteDescuentos(datos: DatosReporte): ResultadoReporte {
  const localPorId = new Map(datos.locales.map((l) => [l.id, l]));
  const plazaPorId = new Map(datos.plazas.map((p) => [p.id, p]));
  const filas = datos.excepciones
    .map((e) => {
      const local = localPorId.get(e.localId);
      return filaExcepcion(
        e,
        datos,
        local,
        local ? plazaPorId.get(local.plazaId) : undefined,
      );
    })
    .toSorted((a, b) => b.fecha.localeCompare(a.fecha) || b.folio.localeCompare(a.folio));

  const mensual = filas.reduce((s, f) => s + f.mensual, 0);
  const vida = filas.reduce((s, f) => s + f.vida, 0);
  const porPlaza = new Map<string, number>();
  for (const f of filas) porPlaza.set(f.plaza, (porPlaza.get(f.plaza) ?? 0) + f.mensual);
  const mayores = [...porPlaza.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, 8);
  return {
    resumen:
      filas.length === 0
        ? "No hay excepciones de precio en este alcance."
        : `${formatNumero(filas.length)} excepciones que suman ${formatMoneda(mensual)} al mes bajo el mínimo (${formatMoneda(vida)} en la vida de los contratos).`,
    grafica: {
      serie: "Descuento mensual",
      formato: "moneda",
      puntos: mayores.map(([plaza, valor]) => ({
        etiqueta: plaza,
        valor,
        tono: "ambar",
      })),
    },
    tabla: {
      columnas: [
        { clave: "folio", etiqueta: "Folio" },
        { clave: "plaza", etiqueta: "Plaza" },
        { clave: "local", etiqueta: "Local" },
        { clave: "cliente", etiqueta: "Cliente" },
        { clave: "estado", etiqueta: "Estado" },
        { clave: "diferencia", etiqueta: "Renta contra mínimo", formato: "moneda" },
        { clave: "mensual", etiqueta: "Descuento mensual", formato: "moneda" },
        { clave: "vida", etiqueta: "Descuento en el contrato", formato: "moneda" },
        { clave: "solicito", etiqueta: "Solicitó" },
        { clave: "autorizo", etiqueta: "Autorizó (Dirección)" },
        { clave: "aplico", etiqueta: "Aplicó (PMO)" },
        { clave: "motivo", etiqueta: "Motivo" },
        { clave: "fecha", etiqueta: "Fecha" },
      ],
      filas,
    },
  };
}

/** "Cumplimiento del plan de ingresos": renta contratada contra la planeada por la PMO, plaza por plaza. */
export function reporteCumplimientoPlan(datos: DatosReporte): ResultadoReporte {
  const filas = datos.plazas
    .filter((p) => p.estatus === "EN_OPERACION")
    .map((plaza) => {
      const rentas = rentasDeLocales(
        datos.locales.filter((l) => l.plazaId === plaza.id),
        datos.contratos,
        datos.hoy,
      );
      const plan = cumplimientoPlan(rentas.ocupados, rentas.disponibles);
      return {
        plazaId: plaza.id,
        plaza: plaza.nombre,
        planeada: plan.planeada,
        contratada: plan.contratada,
        cumplimiento: plan.cumplimientoPct / 100,
        meta: plaza.metaCumplimientoPct / 100,
        potencial: plan.potencialPct / 100,
      };
    })
    .filter((f) => f.planeada > 0)
    .toSorted((a, b) => a.cumplimiento - a.meta - (b.cumplimiento - b.meta));

  const bajoMeta = filas.filter((f) => f.cumplimiento < f.meta).length;
  const planeada = filas.reduce((s, f) => s + f.planeada, 0);
  const contratada = filas.reduce((s, f) => s + f.contratada, 0);
  return {
    resumen:
      filas.length === 0
        ? "No hay plazas en operación en este alcance."
        : `Cumplimiento de ${formatPorcentaje(planeada === 0 ? 0 : contratada / planeada)} del plan de ingresos; ${formatNumero(bajoMeta)} de ${formatNumero(filas.length)} plazas están bajo su meta.`,
    grafica: {
      serie: "Cumplimiento del plan",
      formato: "porcentaje",
      puntos: filas.map((f) => ({
        etiqueta: f.plaza,
        valor: f.cumplimiento,
        tono: f.cumplimiento < f.meta ? "rojo" : "verde",
      })),
    },
    tabla: {
      columnas: [
        { clave: "plaza", etiqueta: "Plaza" },
        { clave: "planeada", etiqueta: "Renta planeada", formato: "moneda" },
        { clave: "contratada", etiqueta: "Renta contratada", formato: "moneda" },
        { clave: "cumplimiento", etiqueta: "Cumplimiento", formato: "porcentaje" },
        { clave: "meta", etiqueta: "Meta", formato: "porcentaje" },
        { clave: "potencial", etiqueta: "Potencial", formato: "porcentaje" },
      ],
      filas,
    },
  };
}
