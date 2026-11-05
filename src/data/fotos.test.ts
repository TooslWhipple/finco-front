// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATEGORIAS_FOTO_LOCAL,
  CATEGORIAS_MANTENIMIENTO,
  FOTOS_POR_LOCAL,
} from "@/domain";
import { CATALOGO_FOTOS, evidenciaSimulada, type CategoriaCatalogo } from "./fotos";

/** Dimensiones de un webp lossy (chunk VP8): evita depender de `sharp` en el test. */
function dimensionesWebp(buf: Buffer): { ancho: number; alto: number } {
  expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buf.toString("ascii", 8, 12)).toBe("WEBP");
  expect(buf.toString("ascii", 12, 16)).toBe("VP8 ");
  return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff };
}

const PUBLIC = join(process.cwd(), "public");
const TODAS_LAS_CATEGORIAS: readonly CategoriaCatalogo[] = [
  ...CATEGORIAS_FOTO_LOCAL,
  ...CATEGORIAS_MANTENIMIENTO,
];

describe("CATALOGO_FOTOS", () => {
  it("tiene fotos suficientes en cada categoría", () => {
    for (const c of CATEGORIAS_FOTO_LOCAL) {
      expect(CATALOGO_FOTOS[c].length, c).toBeGreaterThanOrEqual(FOTOS_POR_LOCAL);
    }
  });

  it("cada src existe en public/ y ancho/alto coinciden con el archivo", () => {
    for (const c of TODAS_LAS_CATEGORIAS) {
      for (const f of CATALOGO_FOTOS[c]) {
        const ruta = join(PUBLIC, f.src);
        expect(existsSync(ruta), f.src).toBe(true);
        expect(dimensionesWebp(readFileSync(ruta)), f.src).toEqual({
          ancho: f.ancho,
          alto: f.alto,
        });
      }
    }
  });

  it("tiene 2 fotos de evidencia por categoría de mantenimiento, con su fuente", () => {
    for (const c of CATEGORIAS_MANTENIMIENTO) {
      expect(CATALOGO_FOTOS[c], c).toHaveLength(2);
      for (const f of CATALOGO_FOTOS[c]) {
        expect(f.fuente, f.src).not.toBe("");
        expect(f.src.startsWith(`/mantenimientos/${c.toLowerCase()}/`), f.src).toBe(true);
      }
    }
  });
});

describe("evidenciaSimulada", () => {
  it("es determinista para la misma semilla", () => {
    expect(evidenciaSimulada("PINTURA", "mnt-1-antes", 1)).toEqual(
      evidenciaSimulada("PINTURA", "mnt-1-antes", 1),
    );
  });

  it("devuelve fotos sin la procedencia, de la categoría pedida", () => {
    const [foto] = evidenciaSimulada("CLIMA", "x", 1);
    expect(Object.keys(foto).sort()).toEqual(["alt", "alto", "ancho", "src"]);
    expect(foto.src).toContain("/mantenimientos/clima/");
  });

  it("no repite las fotos que ya están", () => {
    const antes = evidenciaSimulada("ELECTRICO", "a", 1);
    const despues = evidenciaSimulada("ELECTRICO", "b", 2, antes);
    expect(despues).toHaveLength(1);
    expect(despues[0].src).not.toBe(antes[0].src);
    expect(evidenciaSimulada("ELECTRICO", "c", 2, [...antes, ...despues])).toEqual([]);
  });

  it("no devuelve más de las que hay ni cantidades negativas", () => {
    expect(evidenciaSimulada("LIMPIEZA", "s", 5)).toHaveLength(2);
    expect(evidenciaSimulada("LIMPIEZA", "s", -1)).toEqual([]);
  });
});
