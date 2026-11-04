import { ETIQUETA_SEMAFORO_TERRENO, semaforoTerreno } from "@/domain";
import { formatNumero, formatPorcentaje } from "@/lib/format";
import {
  MARGEN_AJUSTADO,
  reporteCobranza,
  reporteEmbudo,
  reporteOcupacion,
  reportePrecios,
  reporteTerrenos,
  reporteVencimientos,
} from "./calculos";
import type { DatosReporte, Grafica } from "./tipos";

export interface RespuestaAsistente {
  texto: string;
  grafica: Grafica;
}

export interface PreguntaAsistente {
  id: string;
  texto: string;
  /** Palabras (sin acentos, en minúsculas) con las que una pregunta libre cae aquí. */
  claves: readonly string[];
  responder: (datos: DatosReporte) => RespuestaAsistente;
}

const MAX_PUNTOS = 6;

function conTope(grafica: Grafica, orden: "asc" | "desc"): Grafica {
  const puntos = grafica.puntos.toSorted((a, b) =>
    orden === "asc" ? a.valor - b.valor : b.valor - a.valor,
  );
  return { ...grafica, puntos: puntos.slice(0, MAX_PUNTOS) };
}

function plazaMenosOcupada(datos: DatosReporte): RespuestaAsistente {
  const reporte = reporteOcupacion(datos);
  const grafica = conTope(reporte.grafica, "asc");
  const peor = grafica.puntos[0];
  return {
    texto: peor
      ? `${peor.etiqueta} es la plaza con menos ocupación: ${formatPorcentaje(peor.valor)}. ${reporte.resumen}`
      : reporte.resumen,
    grafica,
  };
}

function carteraVencida(datos: DatosReporte): RespuestaAsistente {
  const reporte = reporteCobranza(datos);
  return { texto: reporte.resumen, grafica: reporte.grafica };
}

function contratosPorVencer(datos: DatosReporte): RespuestaAsistente {
  const reporte = reporteVencimientos(datos);
  return { texto: reporte.resumen, grafica: reporte.grafica };
}

function embudo(datos: DatosReporte): RespuestaAsistente {
  const reporte = reporteEmbudo(datos);
  return { texto: reporte.resumen, grafica: reporte.grafica };
}

function proyectosAtrasados(datos: DatosReporte): RespuestaAsistente {
  const reporte = reporteTerrenos(datos);
  const atrasados = datos.terrenos.filter(
    (t) => t.etapa !== "ABIERTO" && semaforoTerreno(t, datos.hoy) !== "VERDE",
  );
  if (atrasados.length === 0) {
    return {
      texto: "Ningún proyecto va con atraso. " + reporte.resumen,
      grafica: reporte.grafica,
    };
  }
  const detalle = atrasados
    .map(
      (t) =>
        `${t.nombre} (${ETIQUETA_SEMAFORO_TERRENO[semaforoTerreno(t, datos.hoy)].toLowerCase()}, ${formatNumero(t.avancePct)}%)`,
    )
    .join(", ");
  return {
    texto: `${formatNumero(atrasados.length)} proyectos van con atraso: ${detalle}.`,
    grafica: {
      ...reporte.grafica,
      puntos: reporte.grafica.puntos.filter((p) => p.tono !== "verde"),
    },
  };
}

function margenAjustado(datos: DatosReporte): RespuestaAsistente {
  const reporte = reportePrecios(datos);
  const grafica = conTope(reporte.grafica, "asc");
  const peor = grafica.puntos[0];
  return {
    texto: peor
      ? `Donde menos margen hay es ${peor.etiqueta}, con ${formatPorcentaje(peor.valor)} sobre el mínimo. Se consideran ajustados los locales a menos de ${formatPorcentaje(MARGEN_AJUSTADO)} del mínimo. ${reporte.resumen}`
      : reporte.resumen,
    grafica,
  };
}

/** Preguntas sugeridas del asistente; cada una se calcula sobre el estado actual de la demo. */
export const PREGUNTAS_ASISTENTE: readonly PreguntaAsistente[] = [
  {
    id: "ocupacion-baja",
    texto: "¿Qué plaza tiene la ocupación más baja?",
    claves: ["ocupacion", "ocupad", "vacia", "vacante"],
    responder: plazaMenosOcupada,
  },
  {
    id: "cartera-vencida",
    texto: "¿Cuánta cartera vencida tengo y de qué antigüedad?",
    claves: ["cartera", "cobranza", "cobrar", "moros", "saldo", "deuda", "adeudo"],
    responder: carteraVencida,
  },
  {
    id: "contratos-por-vencer",
    texto: "¿Cuántos contratos vencen pronto?",
    claves: ["contrato", "vencen", "vencimiento", "renovar", "renovacion"],
    responder: contratosPorVencer,
  },
  {
    id: "embudo",
    texto: "¿Cómo va el embudo de prospectos?",
    claves: ["embudo", "prospecto", "pipeline", "conversion", "cierre"],
    responder: embudo,
  },
  {
    id: "proyectos-atrasados",
    texto: "¿Qué proyectos van atrasados?",
    claves: ["proyecto", "terreno", "obra", "construccion", "retraso", "atrasad"],
    responder: proyectosAtrasados,
  },
  {
    id: "margen-minimo",
    texto: "¿Dónde me falta margen sobre el precio mínimo?",
    claves: ["precio", "margen", "minimo", "renta", "tarifa"],
    responder: margenAjustado,
  },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Pregunta del catálogo que mejor coincide con el texto libre; `null` si ninguna. */
export function buscarPregunta(texto: string): PreguntaAsistente | null {
  const limpio = normalizar(texto);
  let mejor: PreguntaAsistente | null = null;
  let puntaje = 0;
  for (const pregunta of PREGUNTAS_ASISTENTE) {
    const aciertos = pregunta.claves.filter((c) => limpio.includes(c)).length;
    if (aciertos > puntaje) {
      mejor = pregunta;
      puntaje = aciertos;
    }
  }
  return mejor;
}
