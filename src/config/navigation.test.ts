import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { NAVEGACION, itemActivo } from "./navigation";

const ITEMS = NAVEGACION.flatMap((g) => g.items);

function activos(ruta: string): string[] {
  return ITEMS.filter((i) => itemActivo(i, ruta)).map((i) => i.id);
}

describe("menú", () => {
  it("tiene 12 ítems y todos se ven con cualquier rol, como en el PDF", () => {
    expect(ITEMS).toHaveLength(12);
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
