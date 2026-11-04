import { describe, expect, it } from "vitest";
import { crearTerreno } from "@/domain/fixtures";
import { crearSeed } from "./seed";
import { plazasConTerrenos } from "./terrenos";

const seed = crearSeed();

describe("plazasConTerrenos", () => {
  it("sin cambios en los terrenos conserva las plazas del catálogo", () => {
    expect(plazasConTerrenos(seed.plazas, seed.terrenos, seed.ciudades)).toEqual(
      seed.plazas,
    );
  });

  it("un terreno sin plaza que llega a preventa suma una plaza en preventa", () => {
    const propio = seed.terrenos.find((t) => !t.plazaId)!;
    const terrenos = seed.terrenos.map((t) =>
      t.id === propio.id ? { ...t, etapa: "PREVENTA" as const } : t,
    );
    const plazas = plazasConTerrenos(seed.plazas, terrenos, seed.ciudades);
    expect(plazas).toHaveLength(seed.plazas.length + 1);
    const nueva = plazas.at(-1)!;
    expect(nueva).toMatchObject({
      id: `plz-${propio.id}`,
      nombre: propio.nombre,
      estatus: "PREVENTA",
    });
    expect(plazas.filter((p) => p.estatus === "PREVENTA")).toHaveLength(
      seed.plazas.filter((p) => p.estatus === "PREVENTA").length + 1,
    );
  });

  it("ignora terrenos con ciudad desconocida", () => {
    const t = crearTerreno({ ciudadId: "nada", etapa: "PREVENTA" });
    expect(plazasConTerrenos(seed.plazas, [t], seed.ciudades)).toHaveLength(
      seed.plazas.length,
    );
  });
});
