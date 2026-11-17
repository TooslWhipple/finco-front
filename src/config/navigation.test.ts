import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { NAVEGACION, itemActivo, itemsVisibles, rutaPermitida } from "./navigation";

const ITEMS = NAVEGACION.flatMap((g) => g.items);

function activos(ruta: string): string[] {
  return ITEMS.filter((i) => itemActivo(i, ruta)).map((i) => i.id);
}

describe("menú", () => {
  it("tiene 17 ítems (los 12 del PDF, Mantenimientos del 2026-11-04, Disponibilidad del vendedor, Proveedores, Mis licitaciones y Resumen comercial)", () => {
    expect(ITEMS).toHaveLength(17);
    expect(ITEMS.some((i) => "accion" in i)).toBe(false);
  });

  it("Precios y reglas va en Administración con el contador de aprobaciones", () => {
    const admin = NAVEGACION.find((g) => g.id === "administracion");
    const item = admin?.items.find((i) => i.id === "precios-y-reglas");
    expect(item?.etiqueta).toBe("Precios y reglas");
    expect(item?.ruta).toBe("/precios-y-reglas");
    expect(item?.badge).toBe("aprobaciones");
  });

  it("la ficha del local resalta Precios y reglas; el resto de /plazas, Plazas y locales", () => {
    expect(activos("/plazas/plz-alborada/locales/plz-alborada-A-09")).toEqual([
      "precios-y-reglas",
    ]);
    expect(activos("/plazas/plz-alborada")).toEqual(["plazas"]);
    expect(activos("/precios-y-reglas")).toEqual(["precios-y-reglas"]);
  });

  it("Mantenimientos va en Operación y solo se activa en su ruta", () => {
    const operacion = NAVEGACION.find((g) => g.id === "operacion");
    expect(operacion?.items.map((i) => i.id)).toContain("mantenimientos");
    expect(activos("/mantenimientos")).toEqual(["mantenimientos"]);
  });

  it("Proveedores va en Operación justo después de Mantenimientos y resalta también la ficha", () => {
    const operacion = NAVEGACION.find((g) => g.id === "operacion")!;
    const ids = operacion.items.map((i) => i.id);
    expect(ids[ids.indexOf("mantenimientos") + 1]).toBe("proveedores");
    expect(activos("/proveedores")).toEqual(["proveedores"]);
    expect(activos("/proveedores/prv-1")).toEqual(["proveedores"]);
  });
});

describe("visibilidad por rol", () => {
  const ids = (rol: Parameters<typeof itemsVisibles>[0]) =>
    itemsVisibles(rol).flatMap((g) => g.items.map((i) => i.id));

  it("Dirección y Superadmin ven todo salvo los ítems soloRoles", () => {
    expect(ids("DIRECCION")).toHaveLength(16);
    expect(ids("SUPERADMIN")).toHaveLength(16);
    expect(ids("DIRECCION")).not.toContain("mis-licitaciones");
  });

  it("el Contratista solo ve Mis licitaciones, en Operación", () => {
    expect(ids("CONTRATISTA")).toEqual(["mis-licitaciones"]);
    const operacion = NAVEGACION.find((g) => g.id === "operacion")!;
    expect(operacion.items.find((i) => i.id === "mis-licitaciones")?.soloRoles).toBe(
      true,
    );
    expect(activos("/mis-licitaciones/ter-09-lic-07")).toEqual(["mis-licitaciones"]);
  });

  it("rutaPermitida encierra al Contratista y le cierra Mis licitaciones a Dirección y Superadmin", () => {
    for (const ruta of ["/", "/terrenos-y-proyectos", "/cobranza"]) {
      expect(rutaPermitida("CONTRATISTA", ruta), ruta).toBe(false);
    }
    expect(rutaPermitida("CONTRATISTA", "/mis-licitaciones")).toBe(true);
    expect(rutaPermitida("CONTRATISTA", "/mis-licitaciones/ter-09-lic-07")).toBe(true);
    for (const rol of ["DIRECCION", "SUPERADMIN", "PMO"] as const) {
      expect(rutaPermitida(rol, "/mis-licitaciones"), rol).toBe(false);
    }
  });

  it("Ventas", () => {
    expect(ids("VENTAS")).toEqual([
      "disponibilidad",
      "inicio",
      "mapa",
      "plazas",
      "prospectos",
      "cotizaciones",
      "contratos",
      "reportes",
    ]);
  });

  it("el Gerente comercial ve lo de Ventas más su Resumen comercial, primero", () => {
    expect(ids("GERENTE_COMERCIAL")).toEqual(["resumen-comercial", ...ids("VENTAS")]);
    expect(ids("GERENTE_COMERCIAL")).toContain("reportes");
  });

  it("Resumen comercial abre Operación y solo lo abren el Gerente comercial, Dirección y Superadmin", () => {
    const operacion = NAVEGACION.find((g) => g.id === "operacion")!;
    const item = operacion.items[0]!;
    expect(item.id).toBe("resumen-comercial");
    expect(item.ruta).toBe("/resumen-comercial");
    expect(item.prefijo).toBe("/resumen-comercial");
    expect(item.roles).toEqual(["GERENTE_COMERCIAL"]);
    expect(activos("/resumen-comercial")).toEqual(["resumen-comercial"]);
    for (const rol of ["GERENTE_COMERCIAL", "DIRECCION", "SUPERADMIN"] as const) {
      expect(rutaPermitida(rol, "/resumen-comercial"), rol).toBe(true);
    }
    for (const rol of [
      "VENTAS",
      "COBRANZA",
      "PMO",
      "SUPERVISOR_OBRA",
      "CONTRATISTA",
    ] as const) {
      expect(rutaPermitida(rol, "/resumen-comercial"), rol).toBe(false);
    }
  });

  it("Disponibilidad es solo de los vendedores", () => {
    expect(rutaPermitida("PMO", "/disponibilidad")).toBe(false);
    expect(rutaPermitida("COBRANZA", "/disponibilidad")).toBe(false);
    expect(rutaPermitida("VENTAS", "/disponibilidad")).toBe(true);
    expect(activos("/disponibilidad")).toEqual(["disponibilidad"]);
  });

  it("Cobranza", () => {
    expect(ids("COBRANZA")).toEqual([
      "inicio",
      "plazas",
      "contratos",
      "cobranza",
      "reportes",
      "integraciones",
    ]);
  });

  it("PMO", () => {
    expect(ids("PMO")).toEqual([
      "inicio",
      "mapa",
      "plazas",
      "contratos",
      "mantenimientos",
      "proveedores",
      "precios-y-reglas",
      "terrenos",
      "reportes",
      "integraciones",
    ]);
  });

  it("Supervisor de obra solo ve Mantenimientos, Proveedores y Terrenos", () => {
    expect(ids("SUPERVISOR_OBRA")).toEqual(["mantenimientos", "proveedores", "terrenos"]);
  });

  it("PMO, Supervisor de obra, Dirección y Superadmin ven Proveedores y los demás roles no", () => {
    for (const rol of ["PMO", "SUPERVISOR_OBRA", "DIRECCION", "SUPERADMIN"] as const) {
      expect(ids(rol), rol).toContain("proveedores");
      expect(rutaPermitida(rol, "/proveedores/prv-1"), rol).toBe(true);
    }
    for (const rol of ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA"] as const) {
      expect(ids(rol), rol).not.toContain("proveedores");
      expect(rutaPermitida(rol, "/proveedores"), rol).toBe(false);
      expect(rutaPermitida(rol, "/proveedores/prv-1"), rol).toBe(false);
    }
  });

  it("rutaPermitida bloquea módulos ocultos y deja pasar los visibles", () => {
    expect(rutaPermitida("SUPERVISOR_OBRA", "/cobranza")).toBe(false);
    expect(rutaPermitida("SUPERVISOR_OBRA", "/")).toBe(false);
    expect(rutaPermitida("SUPERVISOR_OBRA", "/terrenos-y-proyectos/x")).toBe(true);
    expect(rutaPermitida("COBRANZA", "/precios-y-reglas")).toBe(false);
    expect(rutaPermitida("VENTAS", "/plazas/plz-alborada/locales/a")).toBe(true);
    expect(rutaPermitida("DIRECCION", "/cobranza")).toBe(true);
    expect(rutaPermitida("SUPERVISOR_OBRA", "/ruta-desconocida")).toBe(true);
  });
});

describe("redirecciones", () => {
  it("/aprobaciones redirige a /precios-y-reglas", async () => {
    const reglas = (await nextConfig.redirects?.()) ?? [];
    expect(reglas).toContainEqual(
      expect.objectContaining({
        source: "/aprobaciones",
        destination: "/precios-y-reglas",
      }),
    );
  });
});
