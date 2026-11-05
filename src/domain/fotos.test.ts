import { describe, expect, it } from "vitest";
import { GIROS } from "@/data/catalogo";
import {
  CATEGORIAS_FOTO_LOCAL,
  CATEGORIA_POR_GIRO,
  categoriaFotoDeLocal,
  fotosDeLocal,
  hashCadena,
} from "./fotos";
import { crearLocal } from "./fixtures";
import type { Foto } from "./tipos";

const catalogo = Object.fromEntries(
  CATEGORIAS_FOTO_LOCAL.map((c) => [
    c,
    [1, 2, 3, 4].map((n): Foto => ({
      src: `/locales/${c}/0${n}.webp`,
      alt: c,
      ancho: 1200,
      alto: 800,
    })),
  ]),
) as Record<(typeof CATEGORIAS_FOTO_LOCAL)[number], Foto[]>;

describe("categoriaFotoDeLocal", () => {
  it("mapea de forma explícita todo el catálogo de giros", () => {
    for (const giro of GIROS) expect(CATEGORIA_POR_GIRO[giro], giro).toBeDefined();
  });

  it("local disponible, en preventa o sin giro usa 'vacio'", () => {
    expect(categoriaFotoDeLocal({ estatus: "DISPONIBLE", giro: "Cafetería" })).toBe(
      "vacio",
    );
    expect(categoriaFotoDeLocal({ estatus: "PREVENTA", giro: "Banco" })).toBe("vacio");
    expect(categoriaFotoDeLocal({ estatus: "OCUPADO", giro: undefined })).toBe("vacio");
  });

  it("ocupado o en cotización usa la categoría del giro", () => {
    expect(categoriaFotoDeLocal({ estatus: "OCUPADO", giro: "Cafetería" })).toBe(
      "alimentos",
    );
    expect(categoriaFotoDeLocal({ estatus: "EN_COTIZACION", giro: "Óptica" })).toBe(
      "salud",
    );
  });

  it("un giro desconocido cae en 'servicios'", () => {
    expect(categoriaFotoDeLocal({ estatus: "OCUPADO", giro: "Inventado" })).toBe(
      "servicios",
    );
  });
});

describe("fotosDeLocal", () => {
  const local = crearLocal({ id: "loc-1", estatus: "OCUPADO", giro: "Yoga" });

  it("es determinista y siempre entrega 3 fotos de la categoría", () => {
    const a = fotosDeLocal(local, catalogo);
    expect(fotosDeLocal(local, catalogo)).toEqual(a);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((f) => f.src)).size).toBe(3);
    expect(a.every((f) => f.src.startsWith("/locales/bienestar/"))).toBe(true);
  });

  it("los offsets varían entre locales", () => {
    const primeras = new Set(
      Array.from(
        { length: 40 },
        (_, i) =>
          fotosDeLocal(
            crearLocal({ id: `loc-${i}`, estatus: "OCUPADO", giro: "Yoga" }),
            catalogo,
          )[0].src,
      ),
    );
    expect(primeras.size).toBeGreaterThan(1);
  });

  it("categoría sin fotos devuelve lista vacía", () => {
    expect(fotosDeLocal(local, { ...catalogo, bienestar: [] })).toEqual([]);
  });
});

describe("hashCadena", () => {
  it("es estable y distingue cadenas", () => {
    expect(hashCadena("a")).toBe(0xe40c292c);
    expect(hashCadena("loc-1")).not.toBe(hashCadena("loc-2"));
  });
});
