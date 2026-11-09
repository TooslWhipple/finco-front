import { describe, expect, it } from "vitest";
import { contratoDesbloqueado, evaluarCandados } from "./candados";
import { crearCotizacion, crearLocal } from "./fixtures";
import type { ExcepcionPrecio } from "./tipos";

const HOY = "2026-11-03";
const excepcion = (estado: ExcepcionPrecio["estado"]): ExcepcionPrecio => ({
  id: "EX-1",
  cotizacionId: "COT-2026-0418",
  localId: "A-09",
  rentaSolicitada: 22_900,
  precioMinimo: 23_500,
  estado,
  solicitadaPor: "Jorge Ramírez",
});

describe("evaluarCandados", () => {
  it("devuelve 5 candados que cumplen con una renta válida", () => {
    const c = evaluarCandados(crearCotizacion(), crearLocal(), HOY);
    expect(c).toHaveLength(5);
    expect(c.every((x) => x.estado === "CUMPLE")).toBe(true);
    expect(contratoDesbloqueado(c)).toBe(true);
  });
  it("renta igual al mínimo cumple", () => {
    const c = evaluarCandados(
      crearCotizacion({ rentaMensual: 23_500 }),
      crearLocal(),
      HOY,
    );
    expect(c[1].estado).toBe("CUMPLE");
  });
  it("$22,900 contra mínimo $23,500 falla 1 de 5", () => {
    const c = evaluarCandados(
      crearCotizacion({ rentaMensual: 22_900 }),
      crearLocal(),
      HOY,
    );
    expect(c.filter((x) => x.estado === "FALLA")).toHaveLength(1);
    expect(contratoDesbloqueado(c)).toBe(false);
  });
  it("solo la excepción aplicada desbloquea; pendiente, autorizada o rechazada no", () => {
    const cot = crearCotizacion({ rentaMensual: 22_900 });
    const local = crearLocal();
    const aplicada = evaluarCandados(cot, local, HOY, excepcion("APLICADA"));
    expect(aplicada[1].estado).toBe("EXCEPCION");
    expect(contratoDesbloqueado(aplicada)).toBe(true);
    expect(
      contratoDesbloqueado(
        evaluarCandados(cot, local, HOY, excepcion("AUTORIZADA_DIRECCION")),
      ),
    ).toBe(false);
    expect(
      contratoDesbloqueado(evaluarCandados(cot, local, HOY, excepcion("PENDIENTE"))),
    ).toBe(false);
    expect(
      contratoDesbloqueado(evaluarCandados(cot, local, HOY, excepcion("RECHAZADA"))),
    ).toBe(false);
  });
  it("falla por local ocupado, vigencia vencida, expediente y aval", () => {
    const c = evaluarCandados(
      crearCotizacion({
        vigenteHasta: "2026-11-02",
        prospecto: { nombre: "x", documentosCompletos: false },
      }),
      crearLocal({ estatus: "OCUPADO" }),
      HOY,
    );
    expect(c.filter((x) => x.estado === "FALLA").map((x) => x.id)).toEqual([
      "COTIZACION_OFICIAL",
      "DISPONIBILIDAD",
      "EXPEDIENTE",
      "AVAL",
    ]);
  });
  it("la cotización vence después de su fecha, no el mismo día", () => {
    const c = evaluarCandados(crearCotizacion({ vigenteHasta: HOY }), crearLocal(), HOY);
    expect(c[0].estado).toBe("CUMPLE");
  });
  it("local en cotización sigue disponible para su cotización", () => {
    const c = evaluarCandados(
      crearCotizacion(),
      crearLocal({ estatus: "EN_COTIZACION" }),
      HOY,
    );
    expect(c[2].estado).toBe("CUMPLE");
  });
});
