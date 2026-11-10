import { describe, expect, it } from "vitest";
import { ID_TERRENO_HEROE } from "@/data/obra";
import { can, INICIO_POR_ROL, PERMISOS, veTodoElEquipo } from "./permissions";
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
    expect(can("SUPERVISOR_OBRA", "obra.estimacionRegistrar")).toBe(true);
    expect(can("SUPERADMIN", "obra.estimacionRegistrar")).toBe(true);
    expect(can("PMO", "obra.estimacionRegistrar")).toBe(false);
    expect(can("PMO", "obra.estimacionAutorizar")).toBe(true);
    expect(can("SUPERADMIN", "obra.estimacionAutorizar")).toBe(true);
    expect(can("SUPERVISOR_OBRA", "obra.estimacionAutorizar")).toBe(false);
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
    for (const rol of ["DIRECCION", "VENTAS", "COBRANZA", "SUPERVISOR_OBRA"] as const)
      expect(can(rol, "actualizacionAnual.resolver")).toBe(false);
    expect(can("SUPERADMIN", "actualizacionAnual.resolver")).toBe(true);
    expect(can("PMO", "actualizacionAnual.resolver")).toBe(true);
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

  it("el presupuesto lo edita la PMO y el sobregiro lo autoriza Dirección", () => {
    for (const rol of ["PMO", "SUPERADMIN"] as const)
      expect(can(rol, "mantenimiento.presupuestoEditar")).toBe(true);
    for (const rol of ["DIRECCION", "SUPERADMIN"] as const)
      expect(can(rol, "mantenimiento.sobregiroAutorizar")).toBe(true);
    for (const rol of ["DIRECCION", "VENTAS", "COBRANZA", "SUPERVISOR_OBRA"] as const)
      expect(can(rol, "mantenimiento.presupuestoEditar")).toBe(false);
    for (const rol of ["PMO", "VENTAS", "COBRANZA", "SUPERVISOR_OBRA"] as const)
      expect(can(rol, "mantenimiento.sobregiroAutorizar")).toBe(false);
  });

  it("liberar un local lo hacen la PMO, Cobranza y Superadmin", () => {
    for (const rol of ["PMO", "COBRANZA", "SUPERADMIN"] as const)
      expect(can(rol, "local.liberar")).toBe(true);
    for (const rol of [
      "DIRECCION",
      "VENTAS",
      "GERENTE_COMERCIAL",
      "SUPERVISOR_OBRA",
    ] as const)
      expect(can(rol, "local.liberar")).toBe(false);
  });

  it("el Gerente comercial tiene las acciones de Ventas más ver al equipo", () => {
    for (const accion of PERMISOS.VENTAS)
      expect(can("GERENTE_COMERCIAL", accion)).toBe(true);
    expect(can("GERENTE_COMERCIAL", "comercial.verEquipo")).toBe(true);
    expect(can("GERENTE_COMERCIAL", "excepcion.autorizar")).toBe(false);
  });

  it("ver al equipo es de Gerente comercial, Dirección y Superadmin", () => {
    for (const rol of ["GERENTE_COMERCIAL", "DIRECCION", "SUPERADMIN"] as const)
      expect(can(rol, "comercial.verEquipo")).toBe(true);
    for (const rol of ["VENTAS", "COBRANZA", "PMO", "SUPERVISOR_OBRA"] as const)
      expect(can(rol, "comercial.verEquipo")).toBe(false);
  });

  it("sin rol no hay permisos", () => {
    expect(can(null, "cotizaciones.crear")).toBe(false);
    expect(can(undefined, "cobranza.gestionar")).toBe(false);
  });
});

describe("veTodoElEquipo", () => {
  it("lo ven Gerente comercial, Dirección, Superadmin y PMO", () => {
    for (const rol of ["GERENTE_COMERCIAL", "DIRECCION", "SUPERADMIN", "PMO"] as const)
      expect(veTodoElEquipo(rol)).toBe(true);
    for (const rol of ["VENTAS", "COBRANZA", "SUPERVISOR_OBRA"] as const)
      expect(veTodoElEquipo(rol)).toBe(false);
  });
});

describe("INICIO_POR_ROL", () => {
  it("Ventas y Gerente comercial aterrizan en Disponibilidad", () => {
    expect(INICIO_POR_ROL.VENTAS).toBe("/disponibilidad");
    expect(INICIO_POR_ROL.GERENTE_COMERCIAL).toBe("/disponibilidad");
  });

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
  it("hay al menos uno por rol", () => {
    expect(USUARIOS_DEMO).toHaveLength(8);
    expect(USUARIOS_DEMO.filter((u) => u.rol === "VENTAS").map((u) => u.nombre)).toEqual([
      "Sofía Medina",
      "Luis Cárdenas",
    ]);
    expect(usuarioDeRol("GERENTE_COMERCIAL").nombre).toBe("Jorge Ramírez");
    expect(usuarioDeRol("PMO").nombre).toBe("Ricardo Salas");
    expect(usuarioDeRol("SUPERVISOR_OBRA").nombre).toBe("Héctor Ramos");
    expect(usuarioDeRol("VENTAS").nombre).toBe("Sofía Medina");
  });
});
