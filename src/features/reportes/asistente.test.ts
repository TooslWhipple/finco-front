import { describe, expect, it } from "vitest";
import { DEMO_TODAY } from "@/domain";
import { crearSeed } from "@/data/seed";
import { PREGUNTAS_ASISTENTE, buscarPregunta } from "./asistente";
import type { DatosReporte } from "./tipos";

const seed = crearSeed();
const datos: DatosReporte = {
  ciudades: seed.ciudades,
  plazas: seed.plazas,
  locales: seed.locales,
  contratos: seed.contratos,
  facturas: seed.facturas,
  prospectos: seed.prospectos,
  terrenos: seed.terrenos,
  locatarios: seed.locatarios,
  cotizaciones: seed.cotizaciones,
  excepciones: seed.excepciones,
  hoy: DEMO_TODAY,
};

describe("catálogo del asistente", () => {
  it("hay entre 4 y 6 preguntas sugeridas con ids únicos", () => {
    expect(PREGUNTAS_ASISTENTE.length).toBeGreaterThanOrEqual(4);
    expect(PREGUNTAS_ASISTENTE.length).toBeLessThanOrEqual(6);
    expect(new Set(PREGUNTAS_ASISTENTE.map((p) => p.id)).size).toBe(
      PREGUNTAS_ASISTENTE.length,
    );
  });

  it("cada pregunta responde con texto y gráfica", () => {
    for (const pregunta of PREGUNTAS_ASISTENTE) {
      const r = pregunta.responder(datos);
      expect(r.texto, pregunta.id).not.toBe("");
      expect(r.grafica.puntos.length, pregunta.id).toBeGreaterThan(0);
    }
  });

  it("la respuesta de ocupación nombra la plaza menos ocupada", () => {
    const r = PREGUNTAS_ASISTENTE[0]!.responder(datos);
    expect(r.texto).toContain(r.grafica.puntos[0]!.etiqueta);
    const valores = r.grafica.puntos.map((p) => p.valor);
    expect(valores).toEqual(valores.toSorted((a, b) => a - b));
  });

  it("la respuesta de proyectos solo grafica los que van con atraso", () => {
    const r = PREGUNTAS_ASISTENTE.find((p) => p.id === "proyectos-atrasados")!.responder(
      datos,
    );
    expect(r.grafica.puntos.every((p) => p.tono !== "verde")).toBe(true);
  });

  it("responde sin lanzar cuando no hay datos", () => {
    const vacio: DatosReporte = {
      ...datos,
      plazas: [],
      locales: [],
      contratos: [],
      facturas: [],
      prospectos: [],
      terrenos: [],
    };
    for (const pregunta of PREGUNTAS_ASISTENTE) {
      expect(() => pregunta.responder(vacio), pregunta.id).not.toThrow();
    }
  });
});

describe("buscarPregunta", () => {
  it("reconoce preguntas libres por palabras clave, con o sin acentos", () => {
    expect(buscarPregunta("¿Cómo está la cobranza?")?.id).toBe("cartera-vencida");
    expect(buscarPregunta("embudo de prospectos")?.id).toBe("embudo");
    expect(buscarPregunta("que proyectos tienen retraso")?.id).toBe(
      "proyectos-atrasados",
    );
    expect(buscarPregunta("margen sobre el precio mínimo")?.id).toBe("margen-minimo");
  });

  it("devuelve null si nada coincide", () => {
    expect(buscarPregunta("¿Qué clima hará mañana?")).toBeNull();
  });
});
