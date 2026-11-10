import { describe, expect, it } from "vitest";
import {
  DEMO_TODAY,
  antiguedadSaldos,
  embudoProspectos,
  ocupacion,
  type Terreno,
} from "@/domain";
import { crearSeed } from "@/data/seed";
import { formatMoneda } from "@/lib/format";
import {
  FILTRO_INICIAL,
  REPORTES,
  acotarDatos,
  reporteCobranza,
  reporteEmbudo,
  reporteOcupacion,
  reportePrecios,
  reporteTerrenos,
  reporteVencimientos,
} from "./calculos";
import {
  reporteCumplimientoPlan,
  reporteDescuentos,
  reporteRentasVsMinimo,
} from "./calculos-rentas";
import { tablaACsv } from "./csv";
import type { DatosReporte } from "./tipos";

const seed = crearSeed();
const datos: DatosReporte = {
  ciudades: seed.ciudades,
  plazas: seed.plazas,
  locales: seed.locales,
  contratos: seed.contratos,
  facturas: seed.facturas,
  prospectos: seed.prospectos,
  terrenos: seed.terrenos,
  locatarios: seed.locatarios,
  cotizaciones: seed.cotizaciones,
  excepciones: seed.excepciones,
  hoy: DEMO_TODAY,
};

describe("catálogo", () => {
  it("cada reporte entrega tabla y gráfica con los mismos datos", () => {
    for (const reporte of REPORTES) {
      const r = reporte.calcular(datos);
      expect(r.tabla.filas.length, reporte.id).toBeGreaterThan(0);
      expect(r.grafica.puntos.length, reporte.id).toBeGreaterThan(0);
      expect(r.resumen, reporte.id).not.toBe("");
      for (const fila of r.tabla.filas) {
        for (const c of r.tabla.columnas) expect(fila[c.clave]).toBeDefined();
      }
    }
  });

  it("los ids son únicos", () => {
    expect(new Set(REPORTES.map((r) => r.id)).size).toBe(REPORTES.length);
  });
});

describe("Ofertas por vendedor", () => {
  const definicion = REPORTES.find((r) => r.id === "OFERTAS_VENDEDOR")!;

  it("solo lo ve quien puede ver al equipo", () => {
    expect(definicion.requiere).toBe("comercial.verEquipo");
  });

  it("trae una fila por oferta de cada cotización", () => {
    const total = seed.cotizaciones.reduce((s, c) => s + c.ofertas.length, 0);
    const r = definicion.calcular(datos);
    expect(r.tabla.filas).toHaveLength(total);
    expect(r.tabla.filas[0]).toMatchObject({
      vendedor: expect.any(String),
      cliente: expect.any(String),
    });
  });

  it("el filtro por vendedor deja solo sus ofertas", () => {
    const acotados = acotarDatos(datos, {
      ciudadId: "TODOS",
      plazaId: "TODOS",
      vendedorId: "usr-luis",
    });
    expect(acotados.cotizaciones.every((c) => c.vendedorId === "usr-luis")).toBe(true);
    const r = definicion.calcular(acotados);
    expect(r.tabla.filas.every((f) => f.vendedor === "Luis Cárdenas")).toBe(true);
  });

  it("el filtro por plaza deja solo las cotizaciones de sus locales", () => {
    const acotados = acotarDatos(datos, { ciudadId: "TODOS", plazaId: "plz-alborada" });
    expect(acotados.cotizaciones.length).toBeGreaterThan(0);
    expect(
      acotados.cotizaciones.every((c) => c.localId.startsWith("plz-alborada-")),
    ).toBe(true);
  });
});

describe("acotarDatos", () => {
  it("sin filtro devuelve los mismos datos", () => {
    expect(acotarDatos(datos, FILTRO_INICIAL)).toBe(datos);
  });

  it("una plaza deja solo sus locales, contratos y facturas", () => {
    const acotados = acotarDatos(datos, { ciudadId: "TODOS", plazaId: "plz-alborada" });
    expect(acotados.plazas.map((p) => p.id)).toEqual(["plz-alborada"]);
    expect(acotados.locales.every((l) => l.plazaId === "plz-alborada")).toBe(true);
    const ids = new Set(acotados.locales.map((l) => l.id));
    expect(acotados.contratos.every((c) => ids.has(c.localId))).toBe(true);
    expect(acotados.facturas.every((f) => ids.has(f.localId))).toBe(true);
  });

  it("una ciudad deja solo sus plazas y terrenos", () => {
    const ciudadId = seed.plazas[0]!.ciudadId;
    const acotados = acotarDatos(datos, { ciudadId, plazaId: "TODOS" });
    expect(acotados.plazas.every((p) => p.ciudadId === ciudadId)).toBe(true);
    expect(acotados.terrenos.every((t) => t.ciudadId === ciudadId)).toBe(true);
  });
});

describe("reportes", () => {
  it("ocupación: la fila de la plaza coincide con la ocupación del dominio", () => {
    const r = reporteOcupacion(datos);
    const alborada = r.tabla.filas.find((f) => f.plaza === "Plaza Alborada");
    const locales = seed.locales.filter((l) => l.plazaId === "plz-alborada");
    expect(alborada?.ocupacion).toBeCloseTo(ocupacion(locales));
  });

  it("ocupación: las preventas no entran", () => {
    const r = reporteOcupacion(datos);
    const operativas = seed.plazas.filter((p) => p.estatus === "EN_OPERACION").length;
    expect(r.tabla.filas).toHaveLength(operativas);
  });

  it("cobranza: suma lo que reporta antigüedad de saldos", () => {
    const r = reporteCobranza(datos);
    const total = antiguedadSaldos([...datos.facturas], DEMO_TODAY).reduce(
      (s, c) => s + c.monto,
      0,
    );
    expect(r.tabla.filas.reduce((s, f) => s + Number(f.monto), 0)).toBe(total);
    expect(r.tabla.filas).toHaveLength(4);
  });

  it("precios: ordena de menor a mayor margen", () => {
    const margenes = reportePrecios(datos).tabla.filas.map((f) => Number(f.margen));
    expect(margenes).toEqual(margenes.toSorted((a, b) => a - b));
  });

  it("precios: cada fila trae el id de la plaza para abrir sus rentas", () => {
    const filas = reportePrecios(datos).tabla.filas;
    expect(filas.every((f) => typeof f.plazaId === "string")).toBe(true);
    expect(REPORTES.find((r) => r.id === "PRECIOS")?.drilldown?.destino).toBe(
      "RENTAS_MINIMO",
    );
  });

  it("rentas vs mínimo: una fila por contrato vigente y el extra suma solo las diferencias positivas", () => {
    const r = reporteRentasVsMinimo(datos);
    const vigentes = seed.contratos.filter((c) => c.estado === "VIGENTE");
    expect(r.tabla.filas).toHaveLength(vigentes.length);
    const extra = r.tabla.filas.reduce(
      (s, f) => s + Math.max(0, Number(f.diferencia)),
      0,
    );
    expect(r.resumen).toContain(formatMoneda(extra));
    // La gráfica reparte todos los locales en los cinco rangos.
    expect(r.grafica.puntos).toHaveLength(5);
    expect(r.grafica.puntos.reduce((s, p) => s + p.valor, 0)).toBe(vigentes.length);
    // Los que quedaron bajo el mínimo traen el folio de su excepción.
    const bajo = r.tabla.filas.filter((f) => Number(f.diferencia) < 0);
    expect(bajo.length).toBeGreaterThan(0);
    expect(bajo.every((f) => String(f.excepcion).startsWith("EXC-"))).toBe(true);
  });

  it("rentas vs mínimo: el filtro por plaza deja solo sus locales", () => {
    const r = reporteRentasVsMinimo(
      acotarDatos(datos, { ciudadId: "TODOS", plazaId: "plz-alborada" }),
    );
    expect(new Set(r.tabla.filas.map((f) => f.plaza))).toEqual(
      new Set(["Plaza Alborada"]),
    );
  });

  it("descuentos: lista cada excepción con quién la pidió, autorizó y aplicó", () => {
    const r = reporteDescuentos(datos);
    expect(r.tabla.filas).toHaveLength(seed.excepciones.length);
    const aplicada = r.tabla.filas.find((f) => f.estado === "Aplicada")!;
    expect(aplicada).toMatchObject({
      solicito: "Jorge Ramírez",
      autorizo: "Mariana López",
      aplico: "Ricardo Salas",
    });
    expect(Number(aplicada.mensual)).toBeGreaterThan(0);
    const porAutorizar = r.tabla.filas.find((f) => f.estado === "Por autorizar")!;
    expect(porAutorizar.autorizo).toBe("—");
    expect(porAutorizar.cliente).not.toBe("—");
  });

  it("descuentos: el folio es el de la cotización, no el id interno de la excepción", () => {
    const cotizacion = seed.cotizaciones.find((c) => c.id === "COT-2026-0415")!;
    const solicitada = {
      ...seed.excepciones[0],
      id: "exc-COT-2026-0415-53",
      cotizacionId: cotizacion.id,
      localId: cotizacion.localId,
    };
    const r = reporteDescuentos({
      ...datos,
      excepciones: [...seed.excepciones, solicitada],
    });
    const folios = r.tabla.filas.map((f) => String(f.folio));
    expect(folios).toContain("COT-2026-0415");
    expect(folios.some((f) => f.startsWith("exc-"))).toBe(false);
    expect(tablaACsv(r.tabla)).toContain("\nCOT-2026-0415,");
    expect(tablaACsv(r.tabla)).not.toContain("exc-COT-2026-0415-53");
  });

  it("cumplimiento del plan: una fila por plaza en operación con su meta", () => {
    const r = reporteCumplimientoPlan(datos);
    expect(r.tabla.filas.length).toBeGreaterThan(10);
    for (const f of r.tabla.filas) {
      expect(Number(f.meta)).toBeCloseTo(0.98);
      expect(Number(f.cumplimiento)).toBeGreaterThan(0.5);
    }
  });

  it("embudo: coincide con el embudo del dominio", () => {
    const r = reporteEmbudo(datos);
    const esperado = embudoProspectos(seed.prospectos).map((p) => p.cantidad);
    expect(r.tabla.filas.map((f) => f.cantidad)).toEqual(esperado);
  });

  it("vencimientos: cuenta cada contrato vigente en una sola ventana", () => {
    const r = reporteVencimientos(datos);
    const vigentes = seed.contratos.filter((c) => c.estado === "VIGENTE").length;
    expect(r.tabla.filas.reduce((s, f) => s + Number(f.contratos), 0)).toBe(vigentes);
  });

  it("terrenos: excluye los abiertos y marca el semáforo", () => {
    const r = reporteTerrenos(datos);
    const activos = seed.terrenos.filter((t) => t.etapa !== "ABIERTO");
    expect(r.tabla.filas).toHaveLength(activos.length);
    const atrasado: Terreno = {
      ...activos[0]!,
      avancePct: 0,
      fechaObjetivo: "2026-01-01",
      etapa: "PERMISOS",
    };
    const conAtraso = reporteTerrenos({ ...datos, terrenos: [atrasado] });
    expect(conAtraso.tabla.filas[0]?.semaforo).toBe("En riesgo");
  });

  it("sin datos devuelven un resumen y tablas vacías, sin lanzar", () => {
    const vacio = acotarDatos(datos, { ciudadId: "no-existe", plazaId: "TODOS" });
    for (const reporte of REPORTES) {
      expect(() => reporte.calcular(vacio)).not.toThrow();
    }
  });
});

describe("tablaACsv", () => {
  it("escribe cabecera con unidades, escapa comas y pasa porcentajes a puntos", () => {
    const csv = tablaACsv({
      columnas: [
        { clave: "n", etiqueta: "Nombre" },
        { clave: "m", etiqueta: "Monto", formato: "moneda" },
        { clave: "p", etiqueta: "Parte", formato: "porcentaje" },
      ],
      filas: [{ n: 'Local "A", norte', m: 1200, p: 0.853 }],
    });
    expect(csv).toBe('Nombre,Monto (MXN),Parte (%)\n"Local ""A"", norte",1200,85.3');
  });
});
