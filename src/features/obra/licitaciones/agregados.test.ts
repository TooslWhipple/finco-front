import { describe, expect, it } from "vitest";
import { PROVEEDORES_OBRA } from "@/data/licitaciones";
import { crearLicitacion } from "@/domain/fixtures";
import { conLicitacionAdjudicada } from "@/domain";
import {
  datosGraficaRondas,
  descripcionContraBase,
  eventosDecision,
  matrizProveedores,
  resumenLicitacion,
} from "./agregados";
import { entradaDeRonda, validarRonda } from "./esquemas";

const proveedores = [
  { id: "A", nombre: "Alfa", especialidades: [] },
  { id: "B", nombre: "Beta", especialidades: [] },
  { id: "C", nombre: "Gama", especialidades: [] },
  { id: "D", nombre: "Delta", especialidades: [] },
];
const licitacion = crearLicitacion();

describe("agregados de licitación", () => {
  it("la matriz marca monto, no respondió, descartado y fuera de competencia", () => {
    const filas = matrizProveedores(licitacion, proveedores);
    const tipos = (id: string) =>
      filas.find((f) => f.proveedor.id === id)!.celdas.map((c) => c.tipo);
    expect(tipos("A")).toEqual(["MONTO", "MONTO"]);
    expect(tipos("B")).toEqual(["MONTO", "DESCARTADO"]);
    expect(tipos("D")).toEqual(["SIN_RESPUESTA", "FUERA"]);
  });

  it("la gráfica solo lleva a quienes presentaron propuesta y corta con null donde no hubo", () => {
    const { datos, series } = datosGraficaRondas(licitacion, proveedores);
    expect(series.map((s) => s.clave)).toEqual(["A", "B", "C"]);
    expect(datos[1].B).toBeNull();
  });

  it("el resumen compara la mejor propuesta contra el base mientras está en curso", () => {
    const resumen = resumenLicitacion(licitacion);
    expect(resumen.montoReferencia).toBe(1_000_000);
    expect(resumen.ahorro).toBe(100_000);
    expect(descripcionContraBase(resumen.contraBase!).tono).toBe("neutro");
  });

  it("al adjudicar, la decisión cierra la línea de tiempo", () => {
    const cerrada = conLicitacionAdjudicada(
      licitacion,
      "A",
      "Mejor precio",
      "Ana",
      "2026-09-20",
    );
    const eventos = eventosDecision(cerrada, proveedores);
    expect(eventos.at(-1)?.id).toBe("adjudicacion");
    expect(eventos.some((e) => e.id === "descarte-B")).toBe(true);
  });

  it("la captura traduce texto con formato a montos y valida con las reglas del dominio", () => {
    const captura = {
      A: { texto: "$ 950,000", noRespondio: false },
      C: { texto: "", noRespondio: true },
    };
    expect(entradaDeRonda(["A", "C"], captura)).toEqual({ A: 950_000, C: null });
    expect(validarRonda(licitacion, ["A", "C"], captura).montos).toEqual({});
    expect(
      validarRonda(licitacion, ["A", "C"], { A: { texto: "abc", noRespondio: false } })
        .montos.A,
    ).toBeDefined();
  });

  it("los proveedores del catálogo son únicos", () => {
    expect(new Set(PROVEEDORES_OBRA.map((p) => p.id)).size).toBe(PROVEEDORES_OBRA.length);
  });
});
