import { describe, expect, it } from "vitest";
import { esquemaNuevoProspecto, prospectoDesdeFormulario } from "./esquemas";

const valido = {
  nombre: "Café Mirador",
  rfc: "cmi210305ab1",
  giro: "Cafetería",
  contactoNombre: "Ana Soto",
  telefono: "667 123 4567",
  correo: "ana@mirador.mx",
  origen: "REFERIDO",
  tipoPersona: "MORAL",
  plazaId: "plz-alborada",
  localId: "plz-alborada-A-09",
  avalRegistrado: true,
};

describe("esquemaNuevoProspecto", () => {
  it("acepta un alta válida y normaliza el RFC a mayúsculas", () => {
    const r = esquemaNuevoProspecto.safeParse(valido);
    expect(r.success && r.data.rfc).toBe("CMI210305AB1");
  });

  it.each([
    ["rfc", { rfc: "123" }],
    ["telefono", { telefono: "12345" }],
    ["correo", { correo: "sin-arroba" }],
    ["localId", { localId: "" }],
    ["nombre", { nombre: "ab" }],
  ])("rechaza %s inválido", (campo, cambio) => {
    const r = esquemaNuevoProspecto.safeParse({ ...valido, ...cambio });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].path[0]).toBe(campo);
  });

  it("sin tipo de persona no valida", () => {
    const r = esquemaNuevoProspecto.safeParse({ ...valido, tipoPersona: undefined });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].path[0]).toBe("tipoPersona");
  });

  it("rechaza en el campo rfc un RFC de 13 caracteres con persona moral", () => {
    const r = esquemaNuevoProspecto.safeParse({ ...valido, rfc: "CAMI210305AB1" });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues.map((i) => i.path[0])).toEqual(["rfc"]);
  });

  it("acepta un RFC de 13 caracteres con persona física", () => {
    const r = esquemaNuevoProspecto.safeParse({
      ...valido,
      rfc: "CAMI210305AB1",
      tipoPersona: "FISICA",
    });
    expect(r.success).toBe(true);
  });
});

describe("prospectoDesdeFormulario", () => {
  it("entra al embudo como NUEVO con su alta en la actividad", () => {
    const datos = esquemaNuevoProspecto.parse(valido);
    const p = prospectoDesdeFormulario(datos, "pro-099", "2026-11-03", "usr-luis");
    expect(p).toMatchObject({
      id: "pro-099",
      etapa: "NUEVO",
      localIds: ["plz-alborada-A-09"],
      creadoEl: "2026-11-03",
      vendedorId: "usr-luis",
      aval: "Aval solidario registrado",
      tipoPersona: "MORAL",
    });
    expect(p.documentos).toEqual({});
    expect(p.actividad).toHaveLength(1);
  });

  it("con campaña toma su canal como origen y queda ligado a ella", () => {
    const datos = esquemaNuevoProspecto.parse({ ...valido, origen: "LLAMADA", campanaId: "cmp-01" });
    const p = prospectoDesdeFormulario(datos, "pro-099", "2026-11-03", "usr-luis", {
      id: "cmp-01",
      canal: "REDES",
    });
    expect(p.origen).toBe("REDES");
    expect(p.campanaId).toBe("cmp-01");
    expect(p.actividad[0]?.titulo).toBe("Alta del prospecto (redes sociales)");
  });

  it.each([
    ["sin campaña", {}],
    ["con campanaId vacío", { campanaId: "" }],
  ])("%s conserva el origen elegido y no lleva campanaId", (_caso, parche) => {
    const datos = esquemaNuevoProspecto.parse({ ...valido, origen: "LLAMADA", ...parche });
    const p = prospectoDesdeFormulario(datos, "pro-099", "2026-11-03", "usr-luis");
    expect(p.origen).toBe("LLAMADA");
    expect(p).not.toHaveProperty("campanaId");
    expect(p.actividad[0]?.titulo).toBe("Alta del prospecto (llamada)");
  });
});
