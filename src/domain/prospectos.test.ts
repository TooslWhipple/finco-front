import { describe, expect, it } from "vitest";
import type { Prospecto } from "./tipos";
import { crearProspecto } from "./fixtures";
import {
  diasSinContacto,
  embudoProspectos,
  prospectoActivo,
  prospectosPorLocal,
  siguienteEtapaProspecto,
  siguienteIdProspecto,
  temperaturaProspecto,
} from "./prospectos";

describe("embudoProspectos", () => {
  it("cuenta por etapa en orden, incluidas las vacías", () => {
    const embudo = embudoProspectos([
      crearProspecto({ id: "1", etapa: "NUEVO" }),
      crearProspecto({ id: "2", etapa: "NUEVO" }),
      crearProspecto({ id: "3", etapa: "VISITA" }),
      crearProspecto({ id: "4", etapa: "GANADO" }),
    ]);
    expect(embudo.map((p) => p.etapa)).toEqual([
      "NUEVO",
      "CONTACTADO",
      "VISITA",
      "COTIZADO",
      "GANADO",
      "PERDIDO",
    ]);
    expect(embudo.map((p) => p.cantidad)).toEqual([2, 0, 1, 0, 1, 0]);
    expect(embudo[0].proporcion).toBe(0.5);
  });

  it("sin prospectos todo queda en cero", () => {
    expect(
      embudoProspectos([]).every((p) => p.cantidad === 0 && p.proporcion === 0),
    ).toBe(true);
  });
});

describe("prospectosPorLocal", () => {
  it("agrupa a los activos por local de interés y omite ganados y perdidos", () => {
    const porLocal = prospectosPorLocal([
      crearProspecto({ id: "1", etapa: "VISITA", localIds: ["A", "B"] }),
      crearProspecto({ id: "2", etapa: "COTIZADO", localIds: ["A"] }),
      crearProspecto({ id: "3", etapa: "GANADO", localIds: ["A"] }),
      crearProspecto({ id: "4", etapa: "PERDIDO", localIds: ["C"] }),
    ]);
    expect(porLocal.get("A")?.map((p) => p.id)).toEqual(["1", "2"]);
    expect(porLocal.get("B")?.map((p) => p.id)).toEqual(["1"]);
    expect(porLocal.has("C")).toBe(false);
  });

  it("prospectoActivo excluye las etapas cerradas", () => {
    expect(prospectoActivo(crearProspecto({ etapa: "COTIZADO" }))).toBe(true);
    expect(prospectoActivo(crearProspecto({ etapa: "GANADO" }))).toBe(false);
    expect(prospectoActivo(crearProspecto({ etapa: "PERDIDO" }))).toBe(false);
  });
});

describe("siguienteEtapaProspecto", () => {
  it("avanza por el embudo y se detiene al ganar o perder", () => {
    expect(siguienteEtapaProspecto("NUEVO")).toBe("CONTACTADO");
    expect(siguienteEtapaProspecto("COTIZADO")).toBe("GANADO");
    expect(siguienteEtapaProspecto("GANADO")).toBeNull();
    expect(siguienteEtapaProspecto("PERDIDO")).toBeNull();
  });
});

describe("siguienteIdProspecto", () => {
  it("continúa tras el mayor id aunque haya huecos", () => {
    expect(
      siguienteIdProspecto([
        crearProspecto({ id: "pro-002" }),
        crearProspecto({ id: "pro-009" }),
      ]),
    ).toBe("pro-010");
  });

  it("sin prospectos arranca en 001", () => {
    expect(siguienteIdProspecto([])).toBe("pro-001");
  });
});

describe("diasSinContacto", () => {
  const hoy = "2026-11-03";
  const conActividad = (fechas: string[], etapa: Prospecto["etapa"] = "CONTACTADO") =>
    crearProspecto({
      etapa,
      creadoEl: "2026-08-01",
      actividad: fechas.map((fecha, i) => ({ id: `a${i}`, titulo: "x", fecha })),
    });

  it("toma la actividad más reciente", () => {
    expect(diasSinContacto(conActividad(["2026-09-01", "2026-10-20"]), hoy)).toBe(14);
  });

  it("sin actividad cuenta desde el alta", () => {
    expect(diasSinContacto(conActividad([]), hoy)).toBe(94);
  });

  it("es null si el prospecto está ganado o perdido", () => {
    expect(diasSinContacto(conActividad([], "GANADO"), hoy)).toBeNull();
    expect(diasSinContacto(conActividad([], "PERDIDO"), hoy)).toBeNull();
  });
});

describe("temperaturaProspecto", () => {
  it("cambia en los bordes de 15 y 30 días", () => {
    expect(temperaturaProspecto(0)).toBe("AL_DIA");
    expect(temperaturaProspecto(14)).toBe("AL_DIA");
    expect(temperaturaProspecto(15)).toBe("TIBIO");
    expect(temperaturaProspecto(29)).toBe("TIBIO");
    expect(temperaturaProspecto(30)).toBe("FRIO");
  });

  it("null no tiene temperatura", () => {
    expect(temperaturaProspecto(null)).toBeNull();
  });
});
