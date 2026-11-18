import { describe, expect, it } from "vitest";
import { crearSeed } from "@/data/seed";
import {
  campanaDesdeFormulario,
  esquemaCampana,
  formularioDeCampana,
  type CampanaFormulario,
} from "./esquemas";

const valido: CampanaFormulario = {
  nombre: "Facebook Ads · Prueba",
  canal: "REDES",
  inicio: "2026-11-01",
  fin: "2026-12-31",
  inversion: "15000",
};

describe("esquemaCampana", () => {
  it("acepta un alta válida y convierte la inversión a número", () => {
    const r = esquemaCampana.safeParse(valido);
    expect(r.success && campanaDesdeFormulario(r.data, "cmp-07")).toEqual({
      id: "cmp-07",
      nombre: "Facebook Ads · Prueba",
      canal: "REDES",
      inicio: "2026-11-01",
      fin: "2026-12-31",
      inversion: 15_000,
    });
  });

  it.each([
    ["fin anterior al inicio", { fin: "2026-10-31" }, "fin"],
    ["inversión negativa", { inversion: "-1" }, "inversion"],
    ["inversión que no es número", { inversion: "mucho" }, "inversion"],
    ["nombre corto", { nombre: "FB" }, "nombre"],
    ["sin inicio", { inicio: "" }, "inicio"],
  ])("rechaza %s", (_caso, parche, campo) => {
    const r = esquemaCampana.safeParse({ ...valido, ...parche });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toContain(campo);
  });

  it.each([
    ["ausente", { fin: undefined }],
    ["vacío", { fin: "" }],
  ])("con fin %s guarda la campaña sin fin", (_caso, parche) => {
    const r = esquemaCampana.safeParse({ ...valido, ...parche });
    expect(r.success).toBe(true);
    const campana = r.success ? campanaDesdeFormulario(r.data, "cmp-07") : undefined;
    expect(campana).toBeDefined();
    expect(campana).not.toHaveProperty("fin");
  });

  it("acepta inversión 0", () => {
    const r = esquemaCampana.safeParse({ ...valido, inversion: "0" });
    expect(r.success && r.data.inversion).toBe(0);
  });

  it("el formulario de una campaña del seed vuelve a dar la misma campaña", () => {
    for (const campana of crearSeed().campanas) {
      const r = esquemaCampana.parse(formularioDeCampana(campana));
      expect(campanaDesdeFormulario(r, campana.id)).toEqual(campana);
    }
  });
});
