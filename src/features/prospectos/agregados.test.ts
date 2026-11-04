import { describe, expect, it } from "vitest";
import { siguienteEtapaProspecto, type Prospecto } from "@/domain";
import { crearProspecto } from "@/domain/fixtures";
import {
  FILTRO_INICIAL,
  filtrarProspectos,
  kpisProspectos,
  prospectosDeEtapa,
} from "./agregados";

const plazaDeLocal = new Map([
  ["L1", "plz-a"],
  ["L2", "plz-b"],
]);

const prospectos = [
  crearProspecto({
    id: "1",
    etapa: "NUEVO",
    origen: "REFERIDO",
    localIds: ["L1"],
    creadoEl: "2026-11-01",
  }),
  crearProspecto({
    id: "2",
    etapa: "COTIZADO",
    origen: "BROKER",
    localIds: ["L1", "L2"],
    creadoEl: "2026-10-20",
  }),
  crearProspecto({
    id: "3",
    etapa: "GANADO",
    origen: "BROKER",
    localIds: ["L2"],
    creadoEl: "2026-09-10",
  }),
  crearProspecto({
    id: "4",
    etapa: "PERDIDO",
    origen: "REDES",
    localIds: ["L2"],
    creadoEl: "2026-11-02",
  }),
];

describe("filtrarProspectos", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarProspectos(prospectos, FILTRO_INICIAL, plazaDeLocal)).toHaveLength(4);
  });

  it("filtra por plaza según cualquiera de sus locales de interés", () => {
    const ids = filtrarProspectos(
      prospectos,
      { ...FILTRO_INICIAL, plazaId: "plz-a" },
      plazaDeLocal,
    ).map((p) => p.id);
    expect(ids).toEqual(["1", "2"]);
  });

  it("combina origen, etapa y local", () => {
    expect(
      filtrarProspectos(
        prospectos,
        { ...FILTRO_INICIAL, origen: "BROKER", localId: "L2" },
        plazaDeLocal,
      ).map((p) => p.id),
    ).toEqual(["2", "3"]);
    expect(
      filtrarProspectos(
        prospectos,
        { ...FILTRO_INICIAL, etapa: "PERDIDO" },
        plazaDeLocal,
      ).map((p) => p.id),
    ).toEqual(["4"]);
  });
});

describe("kpisProspectos", () => {
  it("cuenta activos, sin contactar, cotizados, por cotizar y tasa de cierre", () => {
    expect(kpisProspectos(prospectos)).toEqual({
      activos: 2,
      sinContactar: 1,
      enCotizacion: 1,
      porCotizar: 0,
      tasaCierre: 0.5,
    });
  });

  it("sin cierres la tasa queda sin definir", () => {
    expect(kpisProspectos([prospectos[0]]).tasaCierre).toBeNull();
  });

  it("cada avance del embudo mueve al menos un KPI", () => {
    const avanzar = (lista: Prospecto[], id: string) =>
      lista.map((p) => {
        const etapa = p.id === id ? siguienteEtapaProspecto(p.etapa) : null;
        return etapa ? { ...p, etapa } : p;
      });
    let lista = [...prospectos];
    const recorrido = [kpisProspectos(lista)];
    for (let paso = 0; paso < 4; paso++) {
      lista = avanzar(lista, "1");
      recorrido.push(kpisProspectos(lista));
    }
    expect(lista.find((p) => p.id === "1")?.etapa).toBe("GANADO");
    expect(recorrido.map((k) => [k.sinContactar, k.porCotizar, k.enCotizacion])).toEqual([
      [1, 0, 1],
      [0, 0, 1],
      [0, 1, 1],
      [0, 0, 2],
      [0, 0, 1],
    ]);
    expect(recorrido.at(-1)).toMatchObject({ activos: 1, tasaCierre: 2 / 3 });
  });
});

describe("prospectosDeEtapa", () => {
  it("ordena del más reciente al más antiguo", () => {
    const lista = [
      crearProspecto({ id: "a", etapa: "VISITA", creadoEl: "2026-10-01" }),
      crearProspecto({ id: "b", etapa: "VISITA", creadoEl: "2026-10-15" }),
      crearProspecto({ id: "c", etapa: "NUEVO", creadoEl: "2026-10-20" }),
    ];
    expect(prospectosDeEtapa(lista, "VISITA").map((p) => p.id)).toEqual(["b", "a"]);
  });
});
