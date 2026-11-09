import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarraProgreso } from "./barra-progreso";

describe("BarraProgreso", () => {
  it("expone el avance en porcentaje en aria-valuenow", () => {
    const html = renderToStaticMarkup(
      createElement(BarraProgreso, { valor: 0.384, etiqueta: "Avance" }),
    );
    expect(html).toContain('aria-valuenow="38"');
    expect(html).toContain('aria-label="Avance"');
  });

  it("dibuja el marcador solo cuando se pasa", () => {
    const sin = renderToStaticMarkup(
      createElement(BarraProgreso, { valor: 0.5, etiqueta: "Avance" }),
    );
    const con = renderToStaticMarkup(
      createElement(BarraProgreso, { valor: 0.5, marcador: 0.7, etiqueta: "Avance" }),
    );
    expect(sin).not.toContain("data-marcador");
    expect(con).toContain("data-marcador");
    expect(con).toContain("left:70%");
  });
});
