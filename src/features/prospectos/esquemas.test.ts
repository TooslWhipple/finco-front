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
  plazaId: "plz-alborada",
  localId: "plz-alborada-A-09",
  documentosCompletos: false,
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
});

describe("prospectoDesdeFormulario", () => {
  it("entra al embudo como NUEVO con su alta en la actividad", () => {
    const datos = esquemaNuevoProspecto.parse(valido);
    const p = prospectoDesdeFormulario(datos, "pro-099", "2026-11-03");
    expect(p).toMatchObject({
      id: "pro-099",
      etapa: "NUEVO",
      localIds: ["plz-alborada-A-09"],
      creadoEl: "2026-11-03",
      aval: "Aval solidario registrado",
    });
    expect(p.actividad).toHaveLength(1);
  });
});
