import { describe, expect, it } from "vitest";
import { ID_TERRENO_HEROE } from "@/data/obra";
import { rutaPermitida } from "./acceso-rutas";
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

  it("responder una licitación es del Contratista, que no la gestiona", () => {
    expect(PERMISOS.CONTRATISTA).toEqual(["licitacion.responder"]);
    expect(can("CONTRATISTA", "licitacion.responder")).toBe(true);
    expect(can("PMO", "licitacion.responder")).toBe(false);
    expect(can("CONTRATISTA", "licitacion.gestionar")).toBe(false);
    expect(can("SUPERADMIN", "licitacion.responder")).toBe(true);
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

  it("registrar la apertura la hacen Ventas, Gerente comercial, PMO, Cobranza y Superadmin", () => {
    for (const rol of [
      "VENTAS",
      "GERENTE_COMERCIAL",
      "PMO",
      "COBRANZA",
      "SUPERADMIN",
    ] as const)
      expect(can(rol, "local.registrarApertura")).toBe(true);
    for (const rol of ["DIRECCION", "SUPERVISOR_OBRA"] as const)
      expect(can(rol, "local.registrarApertura")).toBe(false);
  });

  it("solo la PMO y Superadmin gestionan el padrón de proveedores", () => {
    for (const rol of ["PMO", "SUPERADMIN"] as const)
      expect(can(rol, "proveedores.gestionar")).toBe(true);
    for (const rol of [
      "DIRECCION",
      "VENTAS",
      "GERENTE_COMERCIAL",
      "COBRANZA",
      "SUPERVISOR_OBRA",
    ] as const)
      expect(can(rol, "proveedores.gestionar")).toBe(false);
  });

  it("el Gerente comercial tiene las acciones de Ventas más ver al equipo", () => {
    for (const accion of PERMISOS.VENTAS)
      expect(can("GERENTE_COMERCIAL", accion)).toBe(true);
    expect(can("GERENTE_COMERCIAL", "comercial.verEquipo")).toBe(true);
    expect(can("GERENTE_COMERCIAL", "excepcion.autorizar")).toBe(false);
  });

  it("gestionar campañas es de Gerente comercial, Dirección y Superadmin", () => {
    for (const rol of ["GERENTE_COMERCIAL", "DIRECCION", "SUPERADMIN"] as const)
      expect(can(rol, "campanas.gestionar"), rol).toBe(true);
    for (const rol of [
      "VENTAS",
      "COBRANZA",
      "PMO",
      "SUPERVISOR_OBRA",
      "CONTRATISTA",
    ] as const)
      expect(can(rol, "campanas.gestionar"), rol).toBe(false);
  });

  it("ver al equipo es de Gerente comercial, Dirección y Superadmin", () => {
    for (const rol of ["GERENTE_COMERCIAL", "DIRECCION", "SUPERADMIN"] as const)
      expect(can(rol, "comercial.verEquipo")).toBe(true);
    for (const rol of ["VENTAS", "COBRANZA", "PMO", "SUPERVISOR_OBRA"] as const)
      expect(can(rol, "comercial.verEquipo")).toBe(false);
  });

  it("ver cobranza y ver obra no son de los roles comerciales", () => {
    for (const rol of ["GERENTE_COMERCIAL", "VENTAS"] as const) {
      expect(can(rol, "cobranza.ver")).toBe(false);
      expect(can(rol, "terrenos.ver")).toBe(false);
    }
    for (const rol of ["DIRECCION", "SUPERADMIN"] as const) {
      expect(can(rol, "cobranza.ver")).toBe(true);
      expect(can(rol, "terrenos.ver")).toBe(true);
    }
    for (const rol of ["COBRANZA", "PMO"] as const)
      expect(can(rol, "cobranza.ver")).toBe(true);
    for (const rol of ["PMO", "SUPERVISOR_OBRA", "COBRANZA"] as const)
      expect(can(rol, "terrenos.ver")).toBe(true);
    expect(can("SUPERVISOR_OBRA", "cobranza.ver")).toBe(false);
    expect(can("CONTRATISTA", "cobranza.ver")).toBe(false);
    expect(can("CONTRATISTA", "terrenos.ver")).toBe(false);
  });

  it("gestionar casos de servicio es de Atención a clientes, Dirección y Superadmin", () => {
    for (const rol of ["ATENCION_CLIENTES", "DIRECCION", "SUPERADMIN"] as const)
      expect(can(rol, "casos.gestionar"), rol).toBe(true);
    for (const rol of [
      "GERENTE_COMERCIAL",
      "PMO",
      "VENTAS",
      "COBRANZA",
      "SUPERVISOR_OBRA",
      "CONTRATISTA",
    ] as const)
      expect(can(rol, "casos.gestionar"), rol).toBe(false);
    expect(can("ATENCION_CLIENTES", "cobranza.ver")).toBe(false);
  });

  it("pagar comisiones y editar su esquema es de Dirección y Superadmin", () => {
    for (const accion of ["comisiones.pagar", "comisiones.esquemaEditar"] as const) {
      for (const rol of ["DIRECCION", "SUPERADMIN"] as const)
        expect(can(rol, accion), `${rol} ${accion}`).toBe(true);
      for (const rol of [
        "GERENTE_COMERCIAL",
        "VENTAS",
        "PMO",
        "COBRANZA",
        "SUPERVISOR_OBRA",
        "CONTRATISTA",
        "ATENCION_CLIENTES",
      ] as const)
        expect(can(rol, accion), `${rol} ${accion}`).toBe(false);
    }
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
  it("Ventas aterriza en Disponibilidad", () => {
    expect(INICIO_POR_ROL.VENTAS).toBe("/disponibilidad");
  });

  it("el Gerente comercial aterriza en su Resumen comercial", () => {
    expect(INICIO_POR_ROL.GERENTE_COMERCIAL).toBe("/resumen-comercial");
  });

  it("el Superadmin aterriza en Precios y reglas", () => {
    expect(INICIO_POR_ROL.SUPERADMIN).toBe("/precios-y-reglas");
  });

  it("el Contratista aterriza en Mis licitaciones", () => {
    expect(INICIO_POR_ROL.CONTRATISTA).toBe("/mis-licitaciones");
  });

  it("Atención a clientes aterriza en Servicio a clientes, una ruta que puede abrir", () => {
    expect(INICIO_POR_ROL.ATENCION_CLIENTES).toBe("/servicio-clientes");
    expect(rutaPermitida("ATENCION_CLIENTES", INICIO_POR_ROL.ATENCION_CLIENTES)).toBe(
      true,
    );
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
    expect(USUARIOS_DEMO).toHaveLength(13);
    expect(USUARIOS_DEMO.filter((u) => u.rol === "VENTAS").map((u) => u.nombre)).toEqual([
      "Sofía Medina",
      "Luis Cárdenas",
    ]);
    expect(usuarioDeRol("GERENTE_COMERCIAL").nombre).toBe("Jorge Ramírez");
    expect(usuarioDeRol("SUPERADMIN").nombre).toBe("Laura Fuentes");
    expect(usuarioDeRol("PMO").nombre).toBe("Ricardo Salas");
    expect(usuarioDeRol("SUPERVISOR_OBRA").nombre).toBe("Héctor Ramos");
    expect(usuarioDeRol("VENTAS").nombre).toBe("Sofía Medina");
    expect(usuarioDeRol("ATENCION_CLIENTES").nombre).toBe("Andrea Robles");
    expect(usuarioDeRol("CONTRATISTA")).toMatchObject({
      id: "usr-contratista",
      proveedorId: "prv-obra-07",
    });
  });

  it("las cuentas reales de Rasek y Sergio van al final, seguidas de Andrea y Benjamin", () => {
    expect(USUARIOS_DEMO.slice(-4, -2)).toEqual([
      {
        id: "usr-rasek",
        nombre: "Rasek Higuera Canett",
        rol: "GERENTE_COMERCIAL",
        cargo: "Director comercial",
      },
      {
        id: "usr-sergio",
        nombre: "Sergio Daniel Villela Aragon",
        rol: "SUPERADMIN",
        cargo: "Coordinación del proyecto",
      },
    ]);
    expect(USUARIOS_DEMO.slice(-2)).toEqual([
      {
        id: "usr-atencion",
        nombre: "Andrea Robles",
        rol: "ATENCION_CLIENTES",
        cargo: "Atención a clientes",
      },
      {
        id: "usr-benjamin",
        nombre: "Benjamin",
        rol: "GERENTE_COMERCIAL",
        cargo: "Gerente comercial",
      },
    ]);
  });

  it("todo usuario Contratista representa a un proveedor del padrón", () => {
    const contratistas = USUARIOS_DEMO.filter((u) => u.rol === "CONTRATISTA");
    expect(contratistas.length).toBeGreaterThan(0);
    for (const u of contratistas) expect(u.proveedorId, u.id).toBeTruthy();
  });
});
