import { describe, expect, it } from "vitest";
import {
  evaluarCandados,
  folioContrato,
  type Cotizacion,
  type ExcepcionPrecio,
} from "@/domain";
import { crearSeed } from "@/data/seed";
import { COTIZACION_HEROE } from "@/data/heroe";
import {
  construirActividad,
  derivarPasos,
  excepcionPendiente,
  excepcionVigente,
  resumenEconomico,
  siguienteFolio,
  terminosDe,
} from "./calculos";

const seed = crearSeed();
const cotizacion = seed.cotizaciones.find((c) => c.id === COTIZACION_HEROE) as Cotizacion;
const local = seed.locales.find((l) => l.id === cotizacion.localId)!;

function excepcion(estado: ExcepcionPrecio["estado"], renta = 22_900): ExcepcionPrecio {
  return {
    id: "exc-1",
    cotizacionId: cotizacion.id,
    localId: local.id,
    rentaSolicitada: renta,
    precioMinimo: local.precioMinimo,
    estado,
    solicitadaPor: "Jorge Ramírez",
    motivo: "Cliente ancla",
  };
}

describe("terminos y resumen económico", () => {
  it("usa valores por omisión para cotizaciones del seed", () => {
    const t = terminosDe({
      ...cotizacion,
      depositoMeses: undefined,
      mesesGracia: undefined,
      inicioContrato: undefined,
    });
    expect(t.depositoMeses).toBe(1);
    expect(t.mesesGracia).toBe(0);
    expect(t.inicioContrato).toBe(cotizacion.emitidaEl);
  });

  it("la cotización héroe trae depósito 2, gracia 1 e inicio 01 dic", () => {
    const t = terminosDe(cotizacion);
    expect(t.depositoMeses).toBe(2);
    expect(t.mesesGracia).toBe(1);
    expect(t.inicioContrato).toBe("2026-12-01");
    expect(cotizacion.actividad).toHaveLength(3);
  });

  it("calcula valor total, primer pago y diferencia vs mínimo", () => {
    const r = resumenEconomico(terminosDe(cotizacion), local);
    expect(r.valorTotal).toBe(22_900 * 36);
    expect(r.primerPago).toBe(45_800);
    expect(r.diferenciaMinimo).toBe(22_900 - local.precioMinimo);
    expect(r.diferenciaVigencia).toBe(r.diferenciaMinimo * 36);
    expect(r.diferenciaMinimo).toBeLessThan(0);
  });

  it("con gracia el primer pago es solo el depósito y el valor es el del plazo completo", () => {
    const t = { ...terminosDe(cotizacion), mesesGracia: 2, depositoMeses: 2 };
    const r = resumenEconomico(t, local);
    expect(r.valorTotal).toBe(22_900 * 36);
    expect(r.primerPago).toBe(22_900 * 2);
  });
});

describe("folios", () => {
  it("siguiente folio sigue al mayor existente", () => {
    expect(siguienteFolio([{ id: "COT-2026-0418" }, { id: "COT-2026-0009" }])).toBe(
      "COT-2026-0419",
    );
    expect(siguienteFolio([])).toBe("COT-2026-0001");
  });

  it("el folio de contrato espeja el de cotización", () => {
    expect(folioContrato("COT-2026-0418")).toBe("CTR-2026-0418");
  });
});

describe("excepciones", () => {
  it("una excepción no cubre una renta menor a la solicitada", () => {
    const lista = [excepcion("APROBADA")];
    expect(excepcionVigente(lista, cotizacion.id, 22_900)?.estado).toBe("APROBADA");
    expect(excepcionVigente(lista, cotizacion.id, 22_000)).toBeUndefined();
  });

  it("detecta la excepción pendiente", () => {
    expect(excepcionPendiente([excepcion("PENDIENTE")], cotizacion.id)).toBeDefined();
    expect(excepcionPendiente([excepcion("APROBADA")], cotizacion.id)).toBeUndefined();
  });
});

describe("pasos", () => {
  const hoy = "2026-11-03";
  const actual = (c: ReturnType<typeof derivarPasos>) =>
    c.find((p) => p.estado === "ACTUAL")?.numero;

  const base = {
    prospecto: "Café Tierra Alta",
    folioCotizacion: "COT-1",
    folioContrato: "CTR-1",
  };

  it("candado de precio roto deja el flujo en el paso 3 con 1 pendiente", () => {
    const candados = evaluarCandados(cotizacion, local, hoy);
    const pasos = derivarPasos({ ...base, candados, contratoGenerado: false });
    expect(actual(pasos)).toBe(3);
    expect(pasos[2].nota).toBe("1 pendiente");
    expect(pasos[0].nota).toBe("Café Tierra Alta");
  });

  it("excepción pendiente deja el flujo en el paso 3", () => {
    const exc = excepcion("PENDIENTE");
    const candados = evaluarCandados(cotizacion, local, hoy, exc);
    const pasos = derivarPasos({
      ...base,
      candados,
      excepcion: exc,
      contratoGenerado: false,
    });
    expect(actual(pasos)).toBe(3);
    expect(pasos[2].nota).toBe("En espera de Superadmin");
  });

  it("excepción aprobada habilita el paso 4 y el contrato lo deja hecho", () => {
    const exc = excepcion("APROBADA");
    const candados = evaluarCandados(cotizacion, local, hoy, exc);
    const listo = derivarPasos({
      ...base,
      candados,
      excepcion: exc,
      contratoGenerado: false,
    });
    expect(actual(listo)).toBe(4);
    expect(listo[3].nota).toBe("Listo para generar");
    const generado = derivarPasos({
      ...base,
      candados,
      excepcion: exc,
      contratoGenerado: true,
    });
    expect(generado[3].nota).toBe("Borrador CTR-1");
    expect(generado[4].estado).toBe("PENDIENTE");
  });
});

describe("actividad", () => {
  it("ordena emisión, excepción y contrato", () => {
    const aprobada = { ...excepcion("APROBADA"), resueltaPor: "Laura Fuentes" };
    const eventos = construirActividad(
      { ...cotizacion, estado: "CONTRATO_GENERADO", contratoGeneradoEl: "2026-11-03" },
      [aprobada],
    );
    expect(eventos.map((e) => e.id)).toEqual([
      "visita",
      "enviada",
      "intento",
      "exc-1-solicitada",
      "exc-1-resuelta",
      "contrato",
    ]);
  });
});
