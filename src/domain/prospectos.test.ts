import { describe, expect, it } from "vitest";
import type { Prospecto } from "./tipos";
import { crearProspecto } from "./fixtures";
import {
  DOCUMENTOS_REQUERIDOS,
  diasSinContacto,
  documentosFaltantes,
  embudoProspectos,
  expedienteCompleto,
  fechaUltimoHecho,
  LARGO_RFC_POR_TIPO,
  prospectoActivo,
  prospectosPorLocal,
  siguienteEtapaProspecto,
  siguienteIdProspecto,
  temperaturaProspecto,
  tipoPersonaDeRfc,
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
      "NEGOCIACION",
      "GANADO",
      "PERDIDO",
    ]);
    expect(embudo.map((p) => p.cantidad)).toEqual([2, 0, 1, 0, 0, 1, 0]);
    expect(embudo[0].proporcion).toBe(0.5);
  });

  it("incluye la etapa de negociación entre cotizado y ganado", () => {
    const embudo = embudoProspectos([crearProspecto({ id: "1", etapa: "NEGOCIACION" })]);
    const etapas = embudo.map((p) => p.etapa);
    expect(etapas.indexOf("NEGOCIACION")).toBe(etapas.indexOf("COTIZADO") + 1);
    expect(etapas.indexOf("GANADO")).toBe(etapas.indexOf("NEGOCIACION") + 1);
    expect(embudo.find((p) => p.etapa === "NEGOCIACION")?.cantidad).toBe(1);
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
    expect(siguienteEtapaProspecto("COTIZADO")).toBe("NEGOCIACION");
    expect(siguienteEtapaProspecto("NEGOCIACION")).toBe("GANADO");
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

  it("fechaUltimoHecho da la actividad más reciente o, sin actividad, el alta", () => {
    expect(fechaUltimoHecho(conActividad(["2026-10-20", "2026-09-01"]))).toBe("2026-10-20");
    expect(fechaUltimoHecho(conActividad([], "GANADO"))).toBe("2026-08-01");
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

describe("expediente del prospecto", () => {
  const fecha = "2026-10-15";

  it("una persona moral sin acta no tiene el expediente completo", () => {
    const moral = {
      tipoPersona: "MORAL" as const,
      documentos: {
        IDENTIFICACION: fecha,
        CONSTANCIA_FISCAL: fecha,
        COMPROBANTE_DOMICILIO: fecha,
        PODER_REPRESENTANTE: fecha,
      },
    };
    expect(expedienteCompleto(moral)).toBe(false);
    expect(documentosFaltantes(moral)).toEqual(["ACTA_CONSTITUTIVA"]);
  });

  it("una persona física con sus tres documentos tiene el expediente completo", () => {
    const fisica = {
      tipoPersona: "FISICA" as const,
      documentos: {
        IDENTIFICACION: fecha,
        CONSTANCIA_FISCAL: fecha,
        COMPROBANTE_DOMICILIO: fecha,
      },
    };
    expect(DOCUMENTOS_REQUERIDOS.FISICA).toHaveLength(3);
    expect(expedienteCompleto(fisica)).toBe(true);
    expect(documentosFaltantes(fisica)).toEqual([]);
  });

  it("documentosFaltantes lista los que faltan en el orden de los requisitos", () => {
    expect(
      documentosFaltantes({
        tipoPersona: "MORAL",
        documentos: { CONSTANCIA_FISCAL: fecha },
      }),
    ).toEqual([
      "IDENTIFICACION",
      "COMPROBANTE_DOMICILIO",
      "ACTA_CONSTITUTIVA",
      "PODER_REPRESENTANTE",
    ]);
  });

  it("tipoPersonaDeRfc distingue 12 caracteres (moral) de 13 (física)", () => {
    expect(tipoPersonaDeRfc("ABC010101AB1")).toBe("MORAL");
    expect(tipoPersonaDeRfc("ABCD010101AB1")).toBe("FISICA");
    expect(LARGO_RFC_POR_TIPO).toEqual({ MORAL: 12, FISICA: 13 });
  });
});
