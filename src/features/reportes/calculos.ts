import {
  ETAPAS_TERRENO,
  ETIQUETA_ETAPA_PROSPECTO,
  ETIQUETA_ETAPA_TERRENO,
  ETIQUETA_SEMAFORO_TERRENO,
  antiguedadSaldos,
  avanceEsperado,
  diasEntre,
  embudoProspectos,
  semaforoTerreno,
  type SemaforoTerreno,
} from "@/domain";
import { formatMoneda, formatNumero, formatPorcentaje } from "@/lib/format";
import { margenSobreMinimo } from "@/features/local/calculos";
import { resumirPlazasMapa } from "@/features/mapa/agregados";
import type { DatosReporte, FiltroReporte, ResultadoReporte, TonoBarra } from "./tipos";

export const TODOS = "TODOS";

export const FILTRO_INICIAL: FiltroReporte = { ciudadId: TODOS, plazaId: TODOS };

export type IdReporte =
  "OCUPACION" | "COBRANZA" | "PRECIOS" | "EMBUDO" | "VENCIMIENTOS" | "TERRENOS";

/** Margen sobre el mínimo por debajo del cual un local está "ajustado". */
export const MARGEN_AJUSTADO = 0.05;

/** Reduce los datos a la ciudad o plaza elegida; lo que no depende de ellas se conserva. */
export function acotarDatos(datos: DatosReporte, filtro: FiltroReporte): DatosReporte {
  const { ciudadId, plazaId } = filtro;
  if (ciudadId === TODOS && plazaId === TODOS) return datos;
  const plazas = datos.plazas.filter(
    (p) =>
      (ciudadId === TODOS || p.ciudadId === ciudadId) &&
      (plazaId === TODOS || p.id === plazaId),
  );
  const idsPlaza = new Set(plazas.map((p) => p.id));
  const locales = datos.locales.filter((l) => idsPlaza.has(l.plazaId));
  const idsLocal = new Set(locales.map((l) => l.id));
  return {
    ...datos,
    plazas,
    locales,
    contratos: datos.contratos.filter((c) => idsLocal.has(c.localId)),
    facturas: datos.facturas.filter((f) => idsLocal.has(f.localId)),
    prospectos: datos.prospectos.filter((p) => p.localIds.some((id) => idsLocal.has(id))),
    terrenos: datos.terrenos.filter(
      (t) =>
        (ciudadId === TODOS || t.ciudadId === ciudadId) &&
        (plazaId === TODOS || t.plazaId === plazaId),
    ),
  };
}

const promedio = (valores: readonly number[]) =>
  valores.length === 0 ? 0 : valores.reduce((s, v) => s + v, 0) / valores.length;

const TONO_SEMAFORO: Record<SemaforoTerreno, TonoBarra> = {
  VERDE: "verde",
  AMARILLO: "ambar",
  ROJO: "rojo",
};

const TONO_RANGO = { ALTA: "verde", MEDIA: "ambar", BAJA: "rojo" } as const;

export function reporteOcupacion(datos: DatosReporte): ResultadoReporte {
  const operativas = resumirPlazasMapa(datos.ciudades, datos.plazas, datos.locales)
    .filter((p) => p.plaza.estatus === "EN_OPERACION")
    .toSorted((a, b) => b.ocupacion - a.ocupacion);
  const locales = operativas.reduce((s, p) => s + p.totalLocales, 0);
  const ocupados = operativas.reduce((s, p) => s + p.ocupados, 0);
  const global = locales === 0 ? 0 : ocupados / locales;
  return {
    resumen:
      operativas.length === 0
        ? "No hay plazas en operación en este alcance."
        : `Ocupación de ${formatPorcentaje(global)} en ${formatNumero(operativas.length)} plazas en operación (${formatNumero(ocupados)} de ${formatNumero(locales)} locales).`,
    grafica: {
      serie: "Ocupación",
      formato: "porcentaje",
      puntos: operativas.map((p) => ({
        etiqueta: p.plaza.nombre,
        valor: p.ocupacion,
        tono: p.rango ? TONO_RANGO[p.rango] : "indigo",
      })),
    },
    tabla: {
      columnas: [
        { clave: "plaza", etiqueta: "Plaza" },
        { clave: "ciudad", etiqueta: "Ciudad" },
        { clave: "locales", etiqueta: "Locales", formato: "numero" },
        { clave: "ocupados", etiqueta: "Ocupados", formato: "numero" },
        { clave: "disponibles", etiqueta: "Por colocar", formato: "numero" },
        { clave: "ocupacion", etiqueta: "Ocupación", formato: "porcentaje" },
      ],
      filas: operativas.map((p) => ({
        plaza: p.plaza.nombre,
        ciudad: p.ciudad.nombre,
        locales: p.totalLocales,
        ocupados: p.ocupados,
        disponibles: p.disponibles,
        ocupacion: p.ocupacion,
      })),
    },
  };
}

export function reporteCobranza(datos: DatosReporte): ResultadoReporte {
  const cubos = antiguedadSaldos([...datos.facturas], datos.hoy);
  const monto = cubos.reduce((s, c) => s + c.monto, 0);
  const facturas = cubos.reduce((s, c) => s + c.facturas, 0);
  const masDe90 = cubos.find((c) => c.rango === "+90")?.monto ?? 0;
  return {
    resumen:
      facturas === 0
        ? "No hay saldos vencidos en este alcance."
        : `Cartera vencida de ${formatMoneda(monto)} en ${formatNumero(facturas)} facturas; ${formatMoneda(masDe90)} tiene más de 90 días.`,
    grafica: {
      serie: "Saldo vencido",
      formato: "moneda",
      puntos: cubos.map((c) => ({
        etiqueta: `${c.rango} días`,
        valor: c.monto,
        tono: c.rango === "1-30" ? "ambar" : "rojo",
      })),
    },
    tabla: {
      columnas: [
        { clave: "rango", etiqueta: "Antigüedad" },
        { clave: "facturas", etiqueta: "Facturas", formato: "numero" },
        { clave: "monto", etiqueta: "Saldo vencido", formato: "moneda" },
        { clave: "proporcion", etiqueta: "% de la cartera", formato: "porcentaje" },
      ],
      filas: cubos.map((c) => ({
        rango: `${c.rango} días`,
        facturas: c.facturas,
        monto: c.monto,
        proporcion: monto === 0 ? 0 : c.monto / monto,
      })),
    },
  };
}

export function reportePrecios(datos: DatosReporte): ResultadoReporte {
  const filas = datos.plazas
    .filter((p) => p.estatus === "EN_OPERACION")
    .map((plaza) => {
      const locales = datos.locales.filter(
        (l) => l.plazaId === plaza.id && l.estatus !== "PREVENTA",
      );
      const margenes = locales.map((l) => margenSobreMinimo(l).fraccion);
      return {
        plaza: plaza.nombre,
        locales: locales.length,
        precioPromedio: promedio(locales.map((l) => l.precioVigente)),
        minimoPromedio: promedio(locales.map((l) => l.precioMinimo)),
        margen: promedio(margenes),
        ajustados: margenes.filter((m) => m < MARGEN_AJUSTADO).length,
      };
    })
    .filter((f) => f.locales > 0)
    .toSorted((a, b) => a.margen - b.margen);
  const ajustados = filas.reduce((s, f) => s + f.ajustados, 0);
  const margenGlobal =
    filas.reduce((s, f) => s + f.margen * f.locales, 0) /
    Math.max(
      1,
      filas.reduce((s, f) => s + f.locales, 0),
    );
  return {
    resumen:
      filas.length === 0
        ? "No hay plazas en operación en este alcance."
        : `Margen promedio de ${formatPorcentaje(margenGlobal)} sobre el precio mínimo; ${formatNumero(ajustados)} locales están a menos de ${formatPorcentaje(MARGEN_AJUSTADO)} del mínimo.`,
    grafica: {
      serie: "Margen sobre mínimo",
      formato: "porcentaje",
      puntos: filas.map((f) => ({
        etiqueta: f.plaza,
        valor: f.margen,
        tono: f.margen < MARGEN_AJUSTADO ? "rojo" : f.margen < 0.1 ? "ambar" : "verde",
      })),
    },
    tabla: {
      columnas: [
        { clave: "plaza", etiqueta: "Plaza" },
        { clave: "locales", etiqueta: "Locales", formato: "numero" },
        { clave: "precioPromedio", etiqueta: "Precio promedio", formato: "moneda" },
        { clave: "minimoPromedio", etiqueta: "Mínimo promedio", formato: "moneda" },
        { clave: "margen", etiqueta: "Margen s/ mínimo", formato: "porcentaje" },
        { clave: "ajustados", etiqueta: "Locales ajustados", formato: "numero" },
      ],
      filas,
    },
  };
}

export function reporteEmbudo(datos: DatosReporte): ResultadoReporte {
  const pasos = embudoProspectos(datos.prospectos);
  const activos = pasos
    .filter((p) => p.etapa !== "GANADO" && p.etapa !== "PERDIDO")
    .reduce((s, p) => s + p.cantidad, 0);
  const ganados = pasos.find((p) => p.etapa === "GANADO")?.cantidad ?? 0;
  const total = datos.prospectos.length;
  return {
    resumen:
      total === 0
        ? "No hay prospectos en este alcance."
        : `${formatNumero(total)} prospectos: ${formatNumero(activos)} activos y ${formatNumero(ganados)} ganados (${formatPorcentaje(ganados / total)} de conversión).`,
    grafica: {
      serie: "Prospectos",
      formato: "numero",
      puntos: pasos.map((p) => ({
        etiqueta: ETIQUETA_ETAPA_PROSPECTO[p.etapa],
        valor: p.cantidad,
        tono: p.etapa === "PERDIDO" ? "rojo" : p.etapa === "GANADO" ? "verde" : "indigo",
      })),
    },
    tabla: {
      columnas: [
        { clave: "etapa", etiqueta: "Etapa" },
        { clave: "cantidad", etiqueta: "Prospectos", formato: "numero" },
        { clave: "proporcion", etiqueta: "% del total", formato: "porcentaje" },
      ],
      filas: pasos.map((p) => ({
        etapa: ETIQUETA_ETAPA_PROSPECTO[p.etapa],
        cantidad: p.cantidad,
        proporcion: p.proporcion,
      })),
    },
  };
}

interface VentanaVencimiento {
  etiqueta: string;
  tono: TonoBarra;
  /** ¿Cae en la ventana un contrato que termina en `dias` días (negativo si ya venció)? */
  incluye: (dias: number) => boolean;
}

export const VENTANAS_VENCIMIENTO: readonly VentanaVencimiento[] = [
  { etiqueta: "Ya vencidos", tono: "rojo", incluye: (d) => d < 0 },
  { etiqueta: "0-90 días", tono: "ambar", incluye: (d) => d >= 0 && d <= 90 },
  { etiqueta: "91-180 días", tono: "ambar", incluye: (d) => d > 90 && d <= 180 },
  { etiqueta: "181-365 días", tono: "verde", incluye: (d) => d > 180 && d <= 365 },
  { etiqueta: "Más de 365 días", tono: "verde", incluye: (d) => d > 365 },
];

export function reporteVencimientos(datos: DatosReporte): ResultadoReporte {
  const vigentes = datos.contratos.filter((c) => c.estado === "VIGENTE");
  const filas = VENTANAS_VENCIMIENTO.map((v) => {
    const contratos = vigentes.filter((c) => v.incluye(diasEntre(datos.hoy, c.fin)));
    return {
      ventana: v,
      contratos: contratos.length,
      renta: contratos.reduce((s, c) => s + c.rentaMensual, 0),
    };
  });
  const proximos = filas[1]!;
  const vencidos = filas[0]!;
  return {
    resumen:
      vigentes.length === 0
        ? "No hay contratos vigentes en este alcance."
        : `${formatNumero(proximos.contratos)} contratos vencen en 90 días (${formatMoneda(proximos.renta)} de renta mensual) y ${formatNumero(vencidos.contratos)} ya vencieron sin renovar.`,
    grafica: {
      serie: "Contratos",
      formato: "numero",
      puntos: filas.map((f) => ({
        etiqueta: f.ventana.etiqueta,
        valor: f.contratos,
        tono: f.ventana.tono,
      })),
    },
    tabla: {
      columnas: [
        { clave: "ventana", etiqueta: "Vencimiento" },
        { clave: "contratos", etiqueta: "Contratos", formato: "numero" },
        { clave: "renta", etiqueta: "Renta mensual", formato: "moneda" },
      ],
      filas: filas.map((f) => ({
        ventana: f.ventana.etiqueta,
        contratos: f.contratos,
        renta: f.renta,
      })),
    },
  };
}

export function reporteTerrenos(datos: DatosReporte): ResultadoReporte {
  const activos = datos.terrenos
    .filter((t) => t.etapa !== "ABIERTO")
    .toSorted(
      (a, b) =>
        ETAPAS_TERRENO.indexOf(a.etapa) - ETAPAS_TERRENO.indexOf(b.etapa) ||
        a.fechaObjetivo.localeCompare(b.fechaObjetivo),
    );
  const semaforos = activos.map((t) => semaforoTerreno(t, datos.hoy));
  const enRiesgo = semaforos.filter((s) => s !== "VERDE").length;
  const nombreCiudad = new Map(datos.ciudades.map((c) => [c.id, c.nombre]));
  return {
    resumen:
      activos.length === 0
        ? "No hay proyectos en desarrollo en este alcance."
        : `${formatNumero(activos.length)} proyectos en desarrollo con avance promedio de ${formatNumero(Math.round(promedio(activos.map((t) => t.avancePct))))}%; ${formatNumero(enRiesgo)} van con atraso.`,
    grafica: {
      serie: "Avance",
      formato: "numero",
      puntos: activos.map((t, i) => ({
        etiqueta: t.nombre,
        valor: t.avancePct,
        tono: TONO_SEMAFORO[semaforos[i]!],
      })),
    },
    tabla: {
      columnas: [
        { clave: "terreno", etiqueta: "Proyecto" },
        { clave: "ciudad", etiqueta: "Ciudad" },
        { clave: "etapa", etiqueta: "Etapa" },
        { clave: "avance", etiqueta: "Avance (%)", formato: "numero" },
        { clave: "esperado", etiqueta: "Esperado (%)", formato: "numero" },
        { clave: "semaforo", etiqueta: "Semáforo" },
        { clave: "objetivo", etiqueta: "Fecha objetivo" },
        { clave: "responsable", etiqueta: "Responsable" },
      ],
      filas: activos.map((t, i) => ({
        terreno: t.nombre,
        ciudad: nombreCiudad.get(t.ciudadId) ?? t.ciudadId,
        etapa: ETIQUETA_ETAPA_TERRENO[t.etapa],
        avance: t.avancePct,
        esperado: Math.round(avanceEsperado(t, datos.hoy)),
        semaforo: ETIQUETA_SEMAFORO_TERRENO[semaforos[i]!],
        objetivo: t.fechaObjetivo,
        responsable: t.responsable,
      })),
    },
  };
}

export interface DefinicionReporte {
  id: IdReporte;
  titulo: string;
  descripcion: string;
  /** Nombre del archivo CSV, sin extensión. */
  archivo: string;
  calcular: (datos: DatosReporte) => ResultadoReporte;
}

/** Catálogo declarativo: agregar un reporte es agregar una entrada. */
export const REPORTES: readonly DefinicionReporte[] = [
  {
    id: "OCUPACION",
    titulo: "Ocupación por plaza",
    descripcion: "Locales rentados contra el total, plaza por plaza.",
    archivo: "ocupacion-por-plaza",
    calcular: reporteOcupacion,
  },
  {
    id: "COBRANZA",
    titulo: "Cobranza y antigüedad de saldos",
    descripcion: "Cartera vencida agrupada por días de atraso.",
    archivo: "cobranza-antiguedad-saldos",
    calcular: reporteCobranza,
  },
  {
    id: "PRECIOS",
    titulo: "Precios vs. mínimo",
    descripcion: "Margen de la renta vigente sobre el precio mínimo autorizado.",
    archivo: "precios-vs-minimo",
    calcular: reportePrecios,
  },
  {
    id: "EMBUDO",
    titulo: "Embudo de prospectos",
    descripcion: "Prospectos por etapa, de la captación al cierre.",
    archivo: "embudo-prospectos",
    calcular: reporteEmbudo,
  },
  {
    id: "VENCIMIENTOS",
    titulo: "Vencimientos de contratos",
    descripcion: "Contratos vigentes por ventana de vencimiento.",
    archivo: "vencimientos-contratos",
    calcular: reporteVencimientos,
  },
  {
    id: "TERRENOS",
    titulo: "Avance de terrenos",
    descripcion: "Proyectos en desarrollo: avance, semáforo y responsable.",
    archivo: "avance-terrenos",
    calcular: reporteTerrenos,
  },
];
