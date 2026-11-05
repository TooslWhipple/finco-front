import { describe, expect, it } from "vitest";
import {
  DEMO_TODAY,
  antiguedadSaldos,
  carteraVencida,
  contratosPorVencer,
  diasAtraso,
  erroresMantenimiento,
  kpisMantenimiento,
  consecutivoDeFolio,
  embudoProspectos,
  enDesarrolloEn,
  estatusCobro,
  evaluarCandados,
  localesDisponibles,
  ocupacion,
  porcentajeCobrado,
  prospectosPorLocal,
  repricingAlLiberar,
  semaforoTerreno,
} from "@/domain";
import { CATALOGO, PROVEEDORES } from "./catalogo";
import { COTIZACION_HEROE, LOCAL_HEROE, PLAZA_HEROE_ID } from "./heroe";
import { crearSeed } from "./seed";

const seed = crearSeed();
const idHeroe = `${PLAZA_HEROE_ID}-${LOCAL_HEROE}`;
const localesDe = (plazaId: string) => seed.locales.filter((l) => l.plazaId === plazaId);

describe("crearSeed: catálogo", () => {
  it("tiene 39 plazas, 946 locales y 11 ciudades", () => {
    expect(seed.plazas).toHaveLength(39);
    expect(seed.locales).toHaveLength(946);
    expect(seed.ciudades).toHaveLength(11);
  });

  it("respeta plazas y locales por ciudad del catálogo", () => {
    for (const ciudad of CATALOGO) {
      const plazas = seed.plazas.filter((p) => p.ciudadId === ciudad.id);
      expect(plazas).toHaveLength(ciudad.plazas);
      const total = plazas.reduce((s, p) => s + localesDe(p.id).length, 0);
      expect(total).toBe(ciudad.locales);
    }
  });

  it("tiene 8 plazas en preventa y sus locales también", () => {
    const preventa = seed.plazas.filter((p) => p.estatus === "PREVENTA");
    expect(preventa).toHaveLength(8);
    for (const plaza of preventa) {
      expect(localesDe(plaza.id).every((l) => l.estatus === "PREVENTA")).toBe(true);
    }
  });

  it("es determinista", () => {
    expect(crearSeed()).toEqual(seed);
  });

  it("tiene ids únicos y referencias válidas", () => {
    const ids = new Set(seed.locales.map((l) => l.id));
    expect(ids.size).toBe(seed.locales.length);
    const plazas = new Set(seed.plazas.map((p) => p.id));
    const plantas = new Set(seed.plantas.map((p) => p.id));
    const locatarios = new Set(seed.locatarios.map((l) => l.id));
    for (const l of seed.locales) {
      expect(plazas.has(l.plazaId)).toBe(true);
      expect(plantas.has(l.plantaId)).toBe(true);
    }
    for (const c of seed.contratos) {
      expect(ids.has(c.localId)).toBe(true);
      expect(locatarios.has(c.locatarioId)).toBe(true);
    }
    for (const f of seed.facturas) expect(ids.has(f.localId)).toBe(true);
    for (const c of seed.cotizaciones) expect(ids.has(c.localId)).toBe(true);
  });
});

describe("crearSeed: contratos y precios", () => {
  it("ningún contrato queda bajo el mínimo del local", () => {
    const porId = new Map(seed.locales.map((l) => [l.id, l]));
    for (const c of seed.contratos) {
      expect(c.rentaMensual).toBeGreaterThanOrEqual(porId.get(c.localId)!.precioMinimo);
    }
  });

  it("todo local tiene precio mínimo ≤ lista", () => {
    for (const l of seed.locales)
      expect(l.precioMinimo).toBeLessThanOrEqual(l.precioVigente);
  });

  it("hay un contrato vigente y una factura por local ocupado", () => {
    const ocupados = seed.locales.filter((l) => l.estatus === "OCUPADO");
    expect(seed.contratos).toHaveLength(ocupados.length);
    expect(seed.facturas).toHaveLength(ocupados.length);
    for (const c of seed.contratos) {
      expect(c.fin > DEMO_TODAY).toBe(true);
      expect(c.inicio <= DEMO_TODAY).toBe(true);
    }
  });

  it("el precio de los locales liberados con historial sigue la regla", () => {
    const liberados = seed.locales.filter(
      (l) =>
        l.estatus === "DISPONIBLE" &&
        l.historial.length > 0 &&
        l.plazaId !== PLAZA_HEROE_ID,
    );
    expect(liberados.length).toBeGreaterThan(0);
    for (const l of liberados) {
      const añoFirma = Number(l.historial[0].fecha.slice(0, 4));
      const años = Array.from({ length: 2026 - añoFirma }, (_, k) => añoFirma + 1 + k);
      expect(repricingAlLiberar(l.historial, l.regla, años)?.precioFinal).toBe(
        l.precioVigente,
      );
    }
  });
});

describe("plaza héroe", () => {
  const locales = localesDe(PLAZA_HEROE_ID);

  it("tiene 58 locales: 40 en planta baja y 18 en planta alta", () => {
    expect(locales).toHaveLength(58);
    expect(locales.filter((l) => l.plantaId === `${PLAZA_HEROE_ID}-pb`)).toHaveLength(40);
    expect(locales.filter((l) => l.plantaId === `${PLAZA_HEROE_ID}-pa`)).toHaveLength(18);
  });

  it("calcula los KPIs de la guía: 37 rentados, 18 disponibles, 3 en cotización", () => {
    expect(locales.filter((l) => l.estatus === "OCUPADO")).toHaveLength(37);
    expect(localesDisponibles(locales)).toBe(18);
    expect(locales.filter((l) => l.estatus === "EN_COTIZACION")).toHaveLength(3);
    expect(Math.round(ocupacion(locales) * 100)).toBe(64);
  });

  it("tiene 6 contratos por vencer y 3 facturas con atraso por $61,420", () => {
    const ids = new Set(locales.map((l) => l.id));
    const contratos = seed.contratos.filter((c) => ids.has(c.localId));
    expect(contratosPorVencer(contratos, DEMO_TODAY)).toHaveLength(6);
    const facturas = seed.facturas.filter((f) => ids.has(f.localId));
    const vencidas = facturas.filter((f) => estatusCobro(f, DEMO_TODAY) === "VENCIDA");
    expect(vencidas).toHaveLength(3);
    expect(carteraVencida(facturas, DEMO_TODAY)).toBe(61_420);
  });

  it("los locales del plano no se traslapan dentro de su planta", () => {
    for (const planta of ["pb", "pa"]) {
      const lista = locales.filter((l) => l.plantaId === `${PLAZA_HEROE_ID}-${planta}`);
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const a = lista[i].geometria;
          const b = lista[j].geometria;
          const traslape =
            a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(traslape, `${lista[i].codigo} vs ${lista[j].codigo}`).toBe(false);
        }
      }
    }
  });

  it("el local A-09 parte de $18,740 en 2021 y llega a $24,860 con mínimo $23,500", () => {
    const a09 = seed.locales.find((l) => l.id === idHeroe)!;
    expect(a09.historial).toHaveLength(1);
    expect(a09.historial[0].precio).toBe(18_740);
    expect(a09.precioVigente).toBe(24_860);
    expect(a09.precioMinimo).toBe(23_500);
    expect(a09.libreDesde).toBe("2026-10-15");
    const reprecio = repricingAlLiberar(
      a09.historial,
      a09.regla,
      [2022, 2023, 2024, 2025, 2026],
    );
    expect(reprecio?.precioFinal).toBe(a09.precioVigente);
  });

  it("la cotización COT-2026-0418 falla 1 de 5 candados", () => {
    const cotizacion = seed.cotizaciones.find((c) => c.id === COTIZACION_HEROE)!;
    const a09 = seed.locales.find((l) => l.id === idHeroe)!;
    const candados = evaluarCandados(cotizacion, a09, DEMO_TODAY);
    expect(candados).toHaveLength(5);
    expect(candados.filter((c) => c.estado === "FALLA").map((c) => c.id)).toEqual([
      "PRECIO_MINIMO",
    ]);
  });
});

describe("cobranza y bandeja", () => {
  it("C-12 es un solo local, ocupado y con una factura vencida de 54 días", () => {
    const c12 = seed.locales.filter(
      (l) => l.plazaId === PLAZA_HEROE_ID && l.id === `${PLAZA_HEROE_ID}-C-12`,
    );
    expect(c12).toHaveLength(1);
    expect(c12[0].estatus).toBe("OCUPADO");
    const vencidas = seed.facturas.filter(
      (f) => f.localId === c12[0].id && estatusCobro(f, DEMO_TODAY) === "VENCIDA",
    );
    expect(vencidas).toHaveLength(1);
    expect(diasAtraso(vencidas[0], DEMO_TODAY)).toBe(54);
  });

  it("los totales de antigüedad de saldos cuadran con la cartera vencida", () => {
    const cubos = antiguedadSaldos(seed.facturas, DEMO_TODAY);
    const vencidas = seed.facturas.filter(
      (f) => estatusCobro(f, DEMO_TODAY) === "VENCIDA",
    );
    expect(cubos.reduce((s, c) => s + c.facturas, 0)).toBe(vencidas.length);
    expect(cubos.reduce((s, c) => s + c.monto, 0)).toBe(
      carteraVencida(seed.facturas, DEMO_TODAY),
    );
  });

  it("ninguna factura abierta vencida pertenece a un mes futuro y los folios son únicos", () => {
    expect(new Set(seed.facturas.map((f) => f.folio)).size).toBe(seed.facturas.length);
    const pct = porcentajeCobrado(seed.facturas);
    expect(pct).toBeGreaterThan(0.5);
    expect(pct).toBeLessThan(1);
  });

  it("la bandeja anual tiene 8 cambios pendientes, ninguno bajo el mínimo", () => {
    expect(seed.cambiosPropuestos).toHaveLength(8);
    const porId = new Map(seed.locales.map((l) => [l.id, l]));
    for (const cambio of seed.cambiosPropuestos) {
      expect(cambio.estado).toBe("PENDIENTE");
      expect(cambio.precioPropuesto).toBeGreaterThanOrEqual(
        porId.get(cambio.localId)!.precioMinimo,
      );
      expect(cambio.precioPropuesto).toBeGreaterThan(cambio.precioActual);
    }
  });

  it("deja una excepción pendiente y otra aprobada sobre cotizaciones bajo el mínimo", () => {
    expect(seed.excepciones.map((e) => e.estado)).toEqual(["PENDIENTE", "APROBADA"]);
    for (const e of seed.excepciones)
      expect(e.rentaSolicitada).toBeLessThan(e.precioMinimo);
  });

  it("las 3 diferencias de EnKontrol suman $8,420", () => {
    expect(seed.diferenciasEnKontrol.reduce((s, d) => s + d.monto, 0)).toBe(8_420);
  });
});

describe("coordenadas de las plazas", () => {
  it("todas las plazas tienen coordenadas únicas, cerca de su ciudad", () => {
    const ciudades = new Map(seed.ciudades.map((c) => [c.id, c]));
    const claves = new Set(
      seed.plazas.map((p) => `${p.coordenadas.lat},${p.coordenadas.lng}`),
    );
    expect(claves.size).toBe(seed.plazas.length);
    for (const plaza of seed.plazas) {
      const ciudad = ciudades.get(plaza.ciudadId)!;
      expect(Math.abs(plaza.coordenadas.lat - ciudad.lat)).toBeLessThanOrEqual(0.08);
      expect(Math.abs(plaza.coordenadas.lng - ciudad.lng)).toBeLessThanOrEqual(0.08);
    }
  });
});

describe("prospectos", () => {
  const porId = new Map(seed.prospectos.map((p) => [p.id, p]));
  const idHeroeLocal = `${PLAZA_HEROE_ID}-${LOCAL_HEROE}`;

  it("son unos 60, con ids únicos, y cubren todas las etapas del embudo", () => {
    expect(seed.prospectos).toHaveLength(porId.size);
    expect(seed.prospectos.length).toBeGreaterThanOrEqual(55);
    expect(seed.prospectos.length).toBeLessThanOrEqual(65);
    expect(embudoProspectos(seed.prospectos).every((p) => p.cantidad > 0)).toBe(true);
  });

  it("cada cotización apunta a su prospecto, cotizado y con la misma instantánea", () => {
    for (const c of seed.cotizaciones) {
      const prospecto = porId.get(c.prospectoId ?? "");
      expect(prospecto, c.id).toBeDefined();
      expect(prospecto!.etapa).toBe("COTIZADO");
      expect(prospecto!.nombre).toBe(c.prospecto.nombre);
      expect(prospecto!.localIds).toEqual([c.localId]);
      expect(prospecto!.documentosCompletos).toBe(c.prospecto.documentosCompletos);
    }
  });

  it("A-09 tiene 2 prospectos activos, uno es el de COT-2026-0418", () => {
    const activos = prospectosPorLocal(seed.prospectos).get(idHeroeLocal) ?? [];
    expect(activos).toHaveLength(2);
    const cotizacion = seed.cotizaciones.find((c) => c.id === COTIZACION_HEROE)!;
    expect(activos.map((p) => p.id)).toContain(cotizacion.prospectoId);
  });

  it("los locales de interés existen y el interés abierto no cae en locales rentados", () => {
    const locales = new Map(seed.locales.map((l) => [l.id, l]));
    for (const p of seed.prospectos) {
      expect(p.localIds.length).toBeGreaterThan(0);
      for (const id of p.localIds) {
        const local = locales.get(id);
        expect(local, `${p.id} → ${id}`).toBeDefined();
        if (p.etapa !== "GANADO") expect(local!.estatus).not.toBe("OCUPADO");
      }
    }
  });

  it("la actividad va en orden cronológico y nunca en el futuro", () => {
    for (const p of seed.prospectos) {
      expect(p.actividad.length).toBeGreaterThan(0);
      const fechas = p.actividad.map((a) => a.fecha);
      expect(fechas, p.id).toEqual([...fechas].sort());
      expect(fechas.at(-1)! <= DEMO_TODAY, p.id).toBe(true);
      expect(p.creadoEl).toBe(fechas[0]);
    }
  });
});

describe("contratos", () => {
  it("los contratos del seed están todos vigentes", () => {
    expect(seed.contratos.every((c) => c.estado === "VIGENTE")).toBe(true);
  });
});

describe("terrenos", () => {
  it("son 14, con ids únicos y ciudades válidas", () => {
    expect(seed.terrenos).toHaveLength(14);
    expect(new Set(seed.terrenos.map((t) => t.id)).size).toBe(14);
    const ciudades = new Set(seed.ciudades.map((c) => c.id));
    for (const t of seed.terrenos) expect(ciudades.has(t.ciudadId)).toBe(true);
  });

  it("las 8 plazas en preventa tienen su terreno en PREVENTA con sus locales", () => {
    const enPreventa = seed.terrenos.filter((t) => t.etapa === "PREVENTA");
    const plazasPreventa = seed.plazas.filter((p) => p.estatus === "PREVENTA");
    expect(enPreventa.map((t) => t.plazaId).sort()).toEqual(
      plazasPreventa.map((p) => p.id).sort(),
    );
    for (const t of enPreventa) {
      expect(t.localesProyectados).toBe(localesDe(t.plazaId!).length);
    }
  });

  it("hay 3 proyectos en desarrollo 2026", () => {
    expect(enDesarrolloEn(seed.terrenos, 2026)).toHaveLength(3);
  });

  it("el avance, los hitos y las fechas son coherentes y el semáforo varía", () => {
    for (const t of seed.terrenos) {
      expect(t.avancePct).toBeGreaterThanOrEqual(0);
      expect(t.avancePct).toBeLessThanOrEqual(100);
      expect(t.inicioDesarrollo < t.fechaObjetivo).toBe(true);
      expect(t.hitos.length).toBeGreaterThan(0);
    }
    const semaforos = new Set(seed.terrenos.map((t) => semaforoTerreno(t, DEMO_TODAY)));
    expect(semaforos).toEqual(new Set(["VERDE", "AMARILLO", "ROJO"]));
  });
});

describe("integraciones", () => {
  it("hay 3 integraciones y cada evento del log pertenece a una", () => {
    expect(seed.integraciones.map((i) => i.id)).toEqual(["ENKONTROL", "EXCEL", "MONDAY"]);
    const ids = new Set(seed.integraciones.map((i) => i.id));
    expect(seed.eventosSync.length).toBeGreaterThan(0);
    for (const e of seed.eventosSync) expect(ids.has(e.integracionId)).toBe(true);
    expect(new Set(seed.eventosSync.map((e) => e.id)).size).toBe(seed.eventosSync.length);
  });

  it("el último sync de cada integración es su evento más reciente y EnKontrol coincide con el seed", () => {
    for (const integracion of seed.integraciones) {
      const fechas = seed.eventosSync
        .filter((e) => e.integracionId === integracion.id)
        .map((e) => e.fecha)
        .sort();
      expect(fechas.at(-1)).toBe(integracion.ultimoSync);
    }
    expect(seed.integraciones[0].ultimoSync).toBe(seed.ultimoSync);
  });
});

describe("mantenimientos", () => {
  const plazaPorId = new Map(seed.plazas.map((p) => [p.id, p]));
  const localPorId = new Map(seed.locales.map((l) => [l.id, l]));
  const proveedorPorId = new Map(seed.proveedores.map((p) => [p.id, p]));
  const deAlborada = seed.mantenimientos.filter((m) => m.plazaId === PLAZA_HEROE_ID);

  it("hay unos 200, con 8 proveedores y folios consecutivos únicos", () => {
    expect(seed.proveedores).toHaveLength(8);
    expect(seed.proveedores.map((p) => p.id)).toEqual(PROVEEDORES.map((p) => p.id));
    expect(seed.mantenimientos.length).toBeGreaterThanOrEqual(150);
    expect(seed.mantenimientos.length).toBeLessThanOrEqual(260);
    expect(new Set(seed.mantenimientos.map((m) => m.id)).size).toBe(
      seed.mantenimientos.length,
    );
    expect(seed.mantenimientos.map((m) => consecutivoDeFolio(m.folio))).toEqual(
      seed.mantenimientos.map((_, i) => i + 1),
    );
    for (const m of seed.mantenimientos) expect(m.folio).toMatch(/^MNT-\d{4}-\d{4}$/);
  });

  it("cada registro apunta a plaza, local de esa plaza y proveedor existentes", () => {
    for (const m of seed.mantenimientos) {
      expect(plazaPorId.has(m.plazaId), m.folio).toBe(true);
      if (m.localId) expect(localPorId.get(m.localId)?.plazaId, m.folio).toBe(m.plazaId);
      expect(proveedorPorId.has(m.proveedorId), m.folio).toBe(true);
    }
  });

  it("cumple todas las invariantes del dominio", () => {
    for (const m of seed.mantenimientos) {
      const errores = erroresMantenimiento(m, {
        local: m.localId ? localPorId.get(m.localId) : undefined,
        proveedor: proveedorPorId.get(m.proveedorId),
      });
      expect(errores, m.folio).toEqual([]);
    }
  });

  it("las fechas caben en la ventana y ningún trabajo empezó o terminó en el futuro", () => {
    for (const m of seed.mantenimientos) {
      expect(
        m.fechaProgramada >= "2026-05-01" && m.fechaProgramada <= "2027-01-31",
        m.folio,
      ).toBe(true);
      if (m.fechaInicio) expect(m.fechaInicio <= DEMO_TODAY, m.folio).toBe(true);
      if (m.fechaFin) expect(m.fechaFin <= DEMO_TODAY, m.folio).toBe(true);
      if (m.estatus === "FINALIZADO")
        expect(m.evidencia.length, m.folio).toBeGreaterThan(0);
    }
  });

  it("las plazas en operación (salvo la héroe) tienen entre 3 y 8 y las de preventa ninguno", () => {
    for (const p of seed.plazas) {
      const n = seed.mantenimientos.filter((m) => m.plazaId === p.id).length;
      if (p.estatus === "PREVENTA") expect(n, p.id).toBe(0);
      else if (p.id !== PLAZA_HEROE_ID) {
        expect(n, p.id).toBeGreaterThanOrEqual(3);
        expect(n, p.id).toBeLessThanOrEqual(8);
      }
    }
  });

  it("hay mezcla de estatus y de tipos", () => {
    expect(new Set(seed.mantenimientos.map((m) => m.estatus)).size).toBe(4);
    expect(new Set(seed.mantenimientos.map((m) => m.tipo)).size).toBe(2);
    const k = kpisMantenimiento(seed.mantenimientos, DEMO_TODAY);
    expect(k.atrasados).toBeGreaterThan(0);
    expect(k.pctPreventivo).toBeGreaterThan(0.3);
    expect(k.pctPreventivo).toBeLessThan(0.8);
  });

  it("Alborada lleva unos 10 a mano, con las filas de Arco y A-09 con 2 (finalizado con evidencia y programado)", () => {
    expect(deAlborada.length).toBeGreaterThanOrEqual(10);
    expect(deAlborada.length).toBeLessThanOrEqual(12);
    const pintura = deAlborada.find((m) => m.titulo === "Pintura completa piso 1");
    expect(proveedorPorId.get(pintura?.proveedorId ?? "")?.nombre).toBe(
      "Mantenimientos Comerciales S.A. de C.V.",
    );
    const deA09 = deAlborada.filter((m) => m.localId === idHeroe);
    expect(deA09.length).toBeGreaterThanOrEqual(2);
    expect(deA09.some((m) => m.estatus === "FINALIZADO" && m.evidencia.length > 0)).toBe(
      true,
    );
    expect(deA09.some((m) => m.estatus === "PROGRAMADO")).toBe(true);
  });

  it("el seed es determinista", () => {
    expect(crearSeed().mantenimientos).toEqual(seed.mantenimientos);
  });
});
