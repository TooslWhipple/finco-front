import { describe, expect, it } from "vitest";
import { ID_TERRENO_HEROE } from "@/data/obra";
import { can, INICIO_POR_ROL, PERMISOS } from "./permissions";
import { USUARIOS_DEMO, usuarioDeRol } from "./usuarios";

describe("can", () => {
  it("PMO y Superadmin editan precio mínimo y reglas; los demás no", () => {
    for (const rol of ["PMO", "SUPERADMIN"] as const) {
      expect(can(rol, "precioMinimo.editar")).toBe(true);
      expect(can(rol, "regla.editar")).toBe(true);
      expect(can(rol, "terrenos.gestionar")).toBe(true);
    }
    for (const rol of ["DIRECCION", "VENTAS", "COBRANZA", "SUPERVISOR_OBRA"] as const) {
      expect(can(rol, "precioMinimo.editar")).toBe(false);
      expect(can(rol, "regla.editar")).toBe(false);
      expect(can(rol, "terrenos.gestionar")).toBe(false);
    }
  });

  it("autorizar excepciones es de Dirección y Superadmin; aplicarlas, de PMO y Superadmin", () => {
    for (const rol of ["DIRECCION", "SUPERADMIN"] as const)
      expect(can(rol, "excepcion.autorizar")).toBe(true);
    for (const rol of ["PMO", "SUPERADMIN"] as const)
      expect(can(rol, "excepcion.aplicar")).toBe(true);
    for (const rol of ["VENTAS", "COBRANZA", "SUPERVISOR_OBRA"] as const) {
      expect(can(rol, "excepcion.autorizar")).toBe(false);
      expect(can(rol, "excepcion.aplicar")).toBe(false);
    }
    expect(can("DIRECCION", "excepcion.aplicar")).toBe(false);
    expect(can("PMO", "excepcion.autorizar")).toBe(false);
  });

  it("meta de ingresos, corte de obra y licitación", () => {
    expect(can("PMO", "metaIngresos.editar")).toBe(true);
    expect(can("SUPERADMIN", "metaIngresos.editar")).toBe(true);
    expect(can("VENTAS", "metaIngresos.editar")).toBe(false);
    expect(can("SUPERVISOR_OBRA", "obra.corteCapturar")).toBe(true);
    expect(can("SUPERADMIN", "obra.corteCapturar")).toBe(true);
    expect(can("PMO", "obra.corteCapturar")).toBe(false);
    expect(can("PMO", "obra.corteValidar")).toBe(true);
    expect(can("SUPERVISOR_OBRA", "obra.corteValidar")).toBe(false);
    expect(can("PMO", "licitacion.gestionar")).toBe(true);
    expect(can("SUPERVISOR_OBRA", "licitacion.gestionar")).toBe(false);
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

  it("solo el Superadmin resuelve la actualización anual", () => {
    for (const rol of [
      "DIRECCION",
      "VENTAS",
      "COBRANZA",
      "PMO",
      "SUPERVISOR_OBRA",
    ] as const)
      expect(can(rol, "actualizacionAnual.resolver")).toBe(false);
    expect(can("SUPERADMIN", "actualizacionAnual.resolver")).toBe(true);
    expect(PERMISOS.SUPERADMIN).toContain("excepcion.aplicar");
  });

  it("Ventas gestiona prospectos y contratos; la configuración es del Superadmin", () => {
    expect(can("VENTAS", "prospectos.gestionar")).toBe(true);
    expect(can("VENTAS", "contratos.gestionar")).toBe(true);
    for (const rol of [
      "DIRECCION",
      "VENTAS",
      "COBRANZA",
      "PMO",
      "SUPERVISOR_OBRA",
    ] as const)
      expect(can(rol, "configuracion.editar")).toBe(false);
    expect(can("SUPERADMIN", "terrenos.gestionar")).toBe(true);
    expect(can("SUPERADMIN", "configuracion.editar")).toBe(true);
    expect(can("COBRANZA", "prospectos.gestionar")).toBe(false);
    expect(can("DIRECCION", "contratos.gestionar")).toBe(false);
  });

  it("los mantenimientos solo los gestiona el Superadmin", () => {
    for (const rol of [
      "DIRECCION",
      "VENTAS",
      "COBRANZA",
      "PMO",
      "SUPERVISOR_OBRA",
    ] as const) {
      expect(can(rol, "mantenimientos.gestionar")).toBe(false);
    }
    expect(can("SUPERADMIN", "mantenimientos.gestionar")).toBe(true);
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

  it("PMO y Supervisor de obra aterrizan en Terrenos y proyectos", () => {
    expect(INICIO_POR_ROL.PMO).toBe("/terrenos-y-proyectos");
    expect(INICIO_POR_ROL.SUPERVISOR_OBRA).toBe(
      `/terrenos-y-proyectos/${ID_TERRENO_HEROE}`,
    );
  });
});

describe("usuarios demo", () => {
  it("hay uno por rol", () => {
    expect(USUARIOS_DEMO).toHaveLength(6);
    expect(usuarioDeRol("PMO").nombre).toBe("Ricardo Salas");
    expect(usuarioDeRol("SUPERVISOR_OBRA").nombre).toBe("Héctor Ramos");
    expect(usuarioDeRol("VENTAS").nombre).toBe("Jorge Ramírez");
  });
});
