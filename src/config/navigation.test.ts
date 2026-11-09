import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { NAVEGACION, itemActivo, itemsVisibles, rutaPermitida } from "./navigation";

const ITEMS = NAVEGACION.flatMap((g) => g.items);

function activos(ruta: string): string[] {
  return ITEMS.filter((i) => itemActivo(i, ruta)).map((i) => i.id);
}

describe("menú", () => {
  it("tiene 13 ítems (los 12 del PDF más Mantenimientos, que pidió el jefe el 2026-11-04) ", () => {
    expect(ITEMS).toHaveLength(13);
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
});

describe("visibilidad por rol", () => {
  const ids = (rol: Parameters<typeof itemsVisibles>[0]) =>
    itemsVisibles(rol).flatMap((g) => g.items.map((i) => i.id));

  it("Dirección y Superadmin ven todo", () => {
    expect(ids("DIRECCION")).toHaveLength(13);
    expect(ids("SUPERADMIN")).toHaveLength(13);
  });

  it("Ventas", () => {
    expect(ids("VENTAS")).toEqual([
      "inicio",
      "mapa",
      "plazas",
      "prospectos",
      "cotizaciones",
      "contratos",
      "reportes",
    ]);
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
      "precios-y-reglas",
      "terrenos",
      "reportes",
      "integraciones",
    ]);
  });

  it("Supervisor de obra solo ve Terrenos y Mantenimientos", () => {
    expect(ids("SUPERVISOR_OBRA")).toEqual(["mantenimientos", "terrenos"]);
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
