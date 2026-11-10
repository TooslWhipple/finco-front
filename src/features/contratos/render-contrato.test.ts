import { describe, expect, it } from "vitest";
import { MACHOTE_ARRENDAMIENTO } from "@/data/machote";
import { crearContrato, crearCotizacion, crearLocal } from "@/domain/fixtures";
import type { Plaza } from "@/domain";
import { renderContrato } from "./render-contrato";

const plaza: Plaza = {
  id: "p1",
  nombre: "Plaza Alborada",
  ciudadId: "c1",
  estatus: "EN_OPERACION",
  coordenadas: { lat: 0, lng: 0 },
  metaCumplimientoPct: 95,
};

const contrato = crearContrato({
  folio: "CTR-2026-0409",
  rentaMensual: 24_860,
  inicio: "2026-12-01",
  fin: "2029-12-01",
});

function todoTexto(r: ReturnType<typeof renderContrato>): string {
  return [
    r.titulo,
    r.proemio,
    ...r.clausulas.flatMap((c) => [c.titulo, c.texto]),
    ...r.firmas.flatMap((f) => [f.rol, f.nombre]),
  ].join("\n");
}

describe("renderContrato", () => {
  const r = renderContrato(
    MACHOTE_ARRENDAMIENTO,
    contrato,
    crearCotizacion({ plazoMeses: 36, mesesGracia: 2, depositoMeses: 2 }),
    crearLocal({ codigo: "A-09", areaM2: 60 }),
    plaza,
    "Café Brasa",
  );

  it("no deja variables sin reemplazar", () => {
    expect(todoTexto(r)).not.toMatch(/\{\w+\}/);
  });

  it("incluye la renta en número y en letra", () => {
    const texto = todoTexto(r);
    expect(texto).toContain("$24,860");
    expect(texto).toContain("veinticuatro mil ochocientos sesenta pesos 00/100 M.N.");
  });

  it("usa los datos del contrato, local y términos", () => {
    const texto = todoTexto(r);
    expect(texto).toContain("CTR-2026-0409");
    expect(texto).toContain("Café Brasa");
    expect(texto).toContain("Plaza Alborada");
    expect(texto).toContain("$49,720");
    expect(r.clausulas[0].ordinal).toBe("Primera");
  });

  it("funciona sin cotización (contrato anterior al portal)", () => {
    const sin = renderContrato(
      MACHOTE_ARRENDAMIENTO,
      contrato,
      undefined,
      crearLocal(),
      plaza,
      "Café Brasa",
    );
    expect(todoTexto(sin)).not.toMatch(/\{\w+\}/);
    expect(todoTexto(sin)).toContain("36 meses");
  });
});
