import { describe, expect, it } from "vitest";
import {
  CASO_VACIO,
  casoDesdeFormulario,
  esquemaCaso,
  esquemaCierre,
  esquemaComentario,
  esquemaRespuesta,
  propuestaEscalamiento,
} from "./esquemas";

const valido = {
  ...CASO_VACIO,
  plazaId: "plz-alborada",
  localId: "plz-alborada-A-01",
  tipo: "FUGA" as const,
  prioridad: "ALTA" as const,
  descripcion: "Fuga en el baño del local",
};

describe("esquemaCaso", () => {
  it("acepta un alta válida sin factura si no es aclaración", () => {
    const r = esquemaCaso.safeParse(valido);
    expect(r.success).toBe(true);
    expect(r.success && casoDesdeFormulario(r.data, "loc-0001")).toEqual({
      plazaId: "plz-alborada",
      localId: "plz-alborada-A-01",
      locatarioId: "loc-0001",
      tipo: "FUGA",
      prioridad: "ALTA",
      canal: "TELEFONO",
      descripcion: "Fuga en el baño del local",
    });
  });

  it("la aclaración sin factura se rechaza; con factura pasa y la conserva", () => {
    const sin = esquemaCaso.safeParse({ ...valido, tipo: "ACLARACION_FACTURA" });
    expect(sin.success).toBe(false);
    expect(sin.error?.issues[0]?.path).toEqual(["facturaId"]);
    const con = esquemaCaso.safeParse({
      ...valido,
      tipo: "ACLARACION_FACTURA",
      facturaId: "fac-0001",
    });
    expect(con.success && casoDesdeFormulario(con.data, "loc-0001").facturaId).toBe(
      "fac-0001",
    );
  });

  it("exige plaza, local y descripción", () => {
    expect(esquemaCaso.safeParse(CASO_VACIO).success).toBe(false);
  });
});

describe("respuesta, comentario y cierre", () => {
  it("la respuesta y el comentario exigen texto", () => {
    expect(esquemaRespuesta.safeParse({ texto: "  " }).success).toBe(false);
    expect(esquemaComentario.safeParse({ texto: "Revisado" }).success).toBe(true);
  });

  it("el cierre sin calificación o con 6 se rechaza", () => {
    expect(esquemaCierre.safeParse({}).success).toBe(false);
    expect(esquemaCierre.safeParse({ calificacion: 6 }).success).toBe(false);
    expect(esquemaCierre.safeParse({ calificacion: 4.5 }).success).toBe(false);
    expect(esquemaCierre.safeParse({ calificacion: 5 }).success).toBe(true);
  });
});

describe("propuestaEscalamiento", () => {
  it("una fuga propone plomería, costo 0, cargo a la plaza y la fecha de mañana", () => {
    expect(
      propuestaEscalamiento(
        { folio: "CAS-2026-0032", tipo: "FUGA", descripcion: "Fuga en el baño" },
        "2026-11-03",
      ),
    ).toEqual({
      titulo: "Fuga · caso CAS-2026-0032",
      descripcion: "Fuga en el baño",
      categoria: "PLOMERIA",
      fechaProgramada: "2026-11-04",
      costoEstimado: 0,
      cargoA: "PLAZA",
    });
  });

  it("una falla propone eléctrico y un daño deja la categoría a quien escala", () => {
    const base = { folio: "CAS-2026-0001", descripcion: "x" };
    expect(
      propuestaEscalamiento({ ...base, tipo: "FALLA" }, "2026-11-03").categoria,
    ).toBe("ELECTRICO");
    expect(
      propuestaEscalamiento({ ...base, tipo: "DANO" }, "2026-11-03").categoria,
    ).toBeUndefined();
  });
});
