import { describe, expect, it } from "vitest";
import { can, INICIO_POR_ROL, PERMISOS } from "./permissions";
import { USUARIOS_DEMO, usuarioDeRol } from "./usuarios";

describe("can", () => {
  it("solo el Superadmin edita el precio mínimo y resuelve excepciones", () => {
    expect(can("SUPERADMIN", "precioMinimo.editar")).toBe(true);
    expect(can("SUPERADMIN", "excepcion.resolver")).toBe(true);
    for (const rol of ["DIRECCION", "VENTAS", "COBRANZA"] as const) {
      expect(can(rol, "precioMinimo.editar")).toBe(false);
      expect(can(rol, "excepcion.resolver")).toBe(false);
      expect(can(rol, "regla.editar")).toBe(false);
    }
  });

  it("Ventas cotiza y solicita excepción, pero no aprueba", () => {
    expect(can("VENTAS", "cotizaciones.crear")).toBe(true);
    expect(can("VENTAS", "contrato.generar")).toBe(true);
    expect(can("VENTAS", "excepcion.solicitar")).toBe(true);
    expect(can("VENTAS", "actualizacionAnual.resolver")).toBe(false);
  });

  it("Cobranza gestiona cobranza y sincroniza; Dirección no", () => {
    expect(can("COBRANZA", "cobranza.gestionar")).toBe(true);
    expect(can("COBRANZA", "integraciones.sincronizar")).toBe(true);
    expect(can("DIRECCION", "cobranza.gestionar")).toBe(false);
  });

  it("solo el Superadmin aprueba o rechaza cambios y excepciones", () => {
    for (const rol of ["DIRECCION", "VENTAS", "COBRANZA"] as const) {
      expect(can(rol, "actualizacionAnual.resolver")).toBe(false);
      expect(can(rol, "excepcion.resolver")).toBe(false);
    }
    expect(can("SUPERADMIN", "actualizacionAnual.resolver")).toBe(true);
    expect(can("SUPERADMIN", "excepcion.resolver")).toBe(true);
    expect(PERMISOS.SUPERADMIN).toContain("excepcion.resolver");
  });

  it("Ventas gestiona prospectos y contratos; terrenos y configuración son del Superadmin", () => {
    expect(can("VENTAS", "prospectos.gestionar")).toBe(true);
    expect(can("VENTAS", "contratos.gestionar")).toBe(true);
    for (const rol of ["DIRECCION", "VENTAS", "COBRANZA"] as const) {
      expect(can(rol, "terrenos.gestionar")).toBe(false);
      expect(can(rol, "configuracion.editar")).toBe(false);
    }
    expect(can("SUPERADMIN", "terrenos.gestionar")).toBe(true);
    expect(can("SUPERADMIN", "configuracion.editar")).toBe(true);
    expect(can("COBRANZA", "prospectos.gestionar")).toBe(false);
    expect(can("DIRECCION", "contratos.gestionar")).toBe(false);
  });

  it("sin rol no hay permisos", () => {
    expect(can(null, "cotizaciones.crear")).toBe(false);
    expect(can(undefined, "cobranza.gestionar")).toBe(false);
  });
});

describe("INICIO_POR_ROL", () => {
  it("el Superadmin aterriza en Precios y reglas", () => {
    expect(INICIO_POR_ROL.SUPERADMIN).toBe("/precios-y-reglas");
  });
});

describe("usuarios demo", () => {
  it("hay uno por rol", () => {
    expect(USUARIOS_DEMO).toHaveLength(4);
    expect(usuarioDeRol("VENTAS").nombre).toBe("Jorge Ramírez");
  });
});
