import { describe, expect, it } from "vitest";
import { crearSeed } from "@/data/seed";
import { RFC } from "@/lib/rfc";
import {
  esquemaProveedor,
  formularioDeProveedor,
  PROVEEDOR_VACIO,
  proveedorDesdeFormulario,
} from "./esquemas";

const padron = crearSeed().proveedores;
const rfcs = padron.map((p) => p.rfc);

const valido = {
  ...PROVEEDOR_VACIO,
  nombre: "Impermeabilizaciones Alborada",
  rfc: "iax200115kz3",
  especialidadesMantenimiento: ["IMPERMEABILIZACION"],
  plazaIds: ["plz-alborada"],
};

describe("esquemaProveedor", () => {
  it("acepta un alta válida con el contacto vacío y normaliza el RFC", () => {
    const r = esquemaProveedor(rfcs).safeParse(valido);
    expect(r.success && r.data.rfc).toBe("IAX200115KZ3");
    expect(r.success && proveedorDesdeFormulario(r.data, "prv-9")).toEqual({
      id: "prv-9",
      nombre: "Impermeabilizaciones Alborada",
      rfc: "IAX200115KZ3",
      contacto: { nombre: "", correo: "", whatsapp: "" },
      especialidadesMantenimiento: ["IMPERMEABILIZACION"],
      partidasObra: [],
      plazaIds: ["plz-alborada"],
      activo: true,
    });
  });

  it("rechaza un RFC repetido aunque venga en minúsculas", () => {
    const r = esquemaProveedor(rfcs).safeParse({ ...valido, rfc: rfcs[0].toLowerCase() });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].message).toBe(
      "Ya hay un proveedor con ese RFC",
    );
  });

  it.each([
    ["rfc", { rfc: "123" }],
    ["nombre", { nombre: "ab" }],
    ["contactoCorreo", { contactoCorreo: "sin-arroba" }],
  ])("rechaza %s inválido", (campo, cambio) => {
    const r = esquemaProveedor(rfcs).safeParse({ ...valido, ...cambio });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].path[0]).toBe(campo);
  });

  it("editar sin cambiar el RFC pasa cuando se excluye al propio proveedor", () => {
    const [primero] = padron;
    const demas = padron.filter((p) => p.id !== primero.id).map((p) => p.rfc);
    const r = esquemaProveedor(demas).safeParse(formularioDeProveedor(primero));
    expect(r.success && proveedorDesdeFormulario(r.data, primero.id)).toEqual(primero);
  });

  it("todos los RFC de la semilla pasan la regex compartida", () => {
    for (const p of padron) expect(p.rfc, p.id).toMatch(RFC);
  });
});
