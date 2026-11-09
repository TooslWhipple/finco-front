import { describe, expect, it } from "vitest";
import { crearContratoObra, crearCorte } from "@/domain/fixtures";
import type { ActividadCronograma } from "@/domain";
import {
  conteoCortes,
  contratosCapturables,
  eventosDeCorte,
  filasContratos,
  filasCortes,
  filtrarCortes,
  kpisExpediente,
  resumenCaptura,
  semanasCapturables,
  tonoDeIndice,
  viewModelGantt,
  viewModelValorGanado,
  volumenesDeCorte,
} from "./agregados";

const actividad = (parcial: Partial<ActividadCronograma>): ActividadCronograma => ({
  id: "a",
  terrenoId: "t",
  fase: "CONSTRUCCION",
  titulo: "Cimentación",
  inicioPlan: "2026-01-05",
  finPlan: "2026-01-23",
  ...parcial,
});

describe("kpisExpediente", () => {
  it("suma presupuesto y contratos; sin contratos todo vale 0", () => {
    const k = kpisExpediente([crearContratoObra()], "2026-01-06");
    expect(k).toMatchObject({ presupuesto: 100_000, contratos: 1 });
    expect(k.avancePlaneado).toBeCloseTo(0.5);
    expect(kpisExpediente([], "2026-01-06")).toEqual({
      presupuesto: 0,
      contratos: 0,
      avancePlaneado: 0,
    });
  });
});

describe("filasContratos", () => {
  it("ordena por inicio y calcula monto y avance planeado", () => {
    const tarde = crearContratoObra({
      id: "b",
      inicioPlan: "2026-02-01",
      finPlan: "2026-02-11",
    });
    const filas = filasContratos([tarde, crearContratoObra()], "2026-01-11");
    expect(filas.map((f) => f.contrato.id)).toEqual(["co-1", "b"]);
    expect(filas[0]).toMatchObject({ monto: 100_000, avancePlaneado: 1 });
    expect(filas[1].avancePlaneado).toBe(0);
  });
});

describe("viewModelGantt", () => {
  it("sin actividades no hay Gantt", () => {
    expect(viewModelGantt([], "2026-01-10")).toBeNull();
  });

  it("posiciona en semanas y ubica la semana de hoy", () => {
    const vm = viewModelGantt(
      [
        actividad({ inicioReal: "2026-01-07" }),
        actividad({
          id: "d",
          fase: "DISENO",
          titulo: "Diseño",
          inicioPlan: "2026-01-05",
          finPlan: "2026-01-09",
        }),
      ],
      "2026-01-14",
    )!;
    expect(vm.semanas).toBe(3);
    expect(vm.columnaHoy).toBe(2);
    expect(vm.grupos.map((g) => g.fase)).toEqual(["DISENO", "CONSTRUCCION"]);
    const construccion = vm.grupos[1].filas[0];
    expect(construccion.plan).toEqual({ columna: 1, semanas: 3 });
    // En curso: el tramo real llega hasta hoy.
    expect(construccion.real).toEqual({ columna: 1, semanas: 2 });
    expect(vm.grupos[0].filas[0].real).toBeUndefined();
    expect(vm.encabezados[0].etiqueta).toBe("2026-01-05");
    expect(vm.encabezados[1].etiqueta).toBeUndefined();
  });
});

// --- cortes ---------------------------------------------------------------

const obra = crearContratoObra({ inicioPlan: "2026-01-05", finPlan: "2026-01-25" });
const lista = [
  crearCorte({ id: "a", semana: "2026-01-05" }),
  crearCorte({ id: "b", semana: "2026-01-12", estado: "FIRMADO_SUPERVISOR" }),
  crearCorte({ id: "c", semana: "2026-01-19", estado: "RECHAZADO", comentario: "no" }),
];

describe("filtros de cortes", () => {
  it("filtra por estado y cuenta cada vista", () => {
    expect(filtrarCortes(lista, "TODOS")).toHaveLength(3);
    expect(filtrarCortes(lista, "POR_VALIDAR").map((c) => c.id)).toEqual(["b"]);
    expect(filtrarCortes(lista, "VALIDADOS").map((c) => c.id)).toEqual(["a"]);
    expect(conteoCortes(lista, "RECHAZADOS")).toBe(1);
  });
});

describe("filasCortes", () => {
  it("ordena de la semana más reciente a la más antigua y calcula importe y % de la semana", () => {
    const filas = filasCortes(lista, [obra]);
    expect(filas.map((f) => f.corte.id)).toEqual(["c", "b", "a"]);
    expect(filas[2]).toMatchObject({ importe: 10_000, avanceSemana: 0.1 });
  });

  it("ignora los cortes de un contrato desconocido", () => {
    expect(filasCortes([crearCorte({ contratoObraId: "otro" })], [obra])).toEqual([]);
  });
});

describe("detalle del corte", () => {
  it("el acumulado incluye las semanas anteriores y la propia, sin las posteriores", () => {
    const filas = volumenesDeCorte(lista[1], obra, lista);
    expect(filas[0]).toMatchObject({ semana: 10, acumulado: 20 });
  });

  it("la trazabilidad suma la resolución solo cuando ya hubo una", () => {
    const sinResolver = crearCorte({
      estado: "FIRMADO_SUPERVISOR",
      validadoPor: undefined,
      validadoEn: undefined,
    });
    expect(eventosDeCorte(sinResolver).map((e) => e.id)).toEqual(["firma"]);
    const resuelto = eventosDeCorte(lista[2]);
    expect(resuelto.at(-1)).toMatchObject({ tono: "coral", detalle: "no" });
  });
});

describe("captura", () => {
  it("ofrece las semanas cerradas sin corte vivo, no la que está en curso", () => {
    expect(semanasCapturables(obra, [lista[0]], "2026-01-27")).toEqual([
      "2026-01-12",
      "2026-01-19",
    ]);
    expect(semanasCapturables(obra, lista, "2026-01-27")).toEqual(["2026-01-19"]);
  });

  it("solo ofrece contratos con semanas libres y sin terminar", () => {
    expect(contratosCapturables([obra], [lista[0]], "2026-01-27")).toEqual([obra]);
    const todas = ["2026-01-05", "2026-01-12", "2026-01-19"].map((semana, i) =>
      crearCorte({ id: String(i), semana }),
    );
    expect(contratosCapturables([obra], todas, "2026-01-27")).toEqual([]);
  });

  it("el resumen suma lo capturado al acumulado anterior y trata el vacío como 0", () => {
    const r = resumenCaptura(obra, [lista[0]], { "c-1": "25" });
    expect(r.filas[0]).toMatchObject({ anterior: 10, semana: 25, nuevoAcumulado: 35 });
    expect(r.importe).toBe(25_000);
    expect(r.avanceNuevo).toBeCloseTo(0.35);
    expect(resumenCaptura(obra, [], { "c-1": "" }).importe).toBe(0);
    expect(resumenCaptura(obra, [], { "c-1": "abc" }).importe).toBe(0);
  });
});

describe("valor ganado", () => {
  it("un proyecto sin contratos no tiene view-model", () => {
    expect(viewModelValorGanado([], [], [], "2026-01-15")).toBeNull();
  });

  it("junta indicadores, curva, alertas y una fila por contrato con su semáforo", () => {
    const vm = viewModelValorGanado([obra], [lista[0]], [], "2026-01-15")!;
    expect(vm.indicadores.ev).toBe(10_000);
    expect(vm.curva.length).toBeGreaterThan(2);
    expect(vm.filas).toHaveLength(1);
    expect(vm.filas[0].semaforoSpi).toBe("ROJO");
    expect(vm.filas[0].semaforoCpi).toBeNull();
    expect(vm.alertas.length).toBeGreaterThan(0);
  });

  it("el tono del KPI sigue el semáforo del índice", () => {
    expect(tonoDeIndice(1)).toBe("positivo");
    expect(tonoDeIndice(0.9)).toBe("alerta");
    expect(tonoDeIndice(0.5)).toBe("peligro");
    expect(tonoDeIndice(null)).toBe("neutro");
  });
});
