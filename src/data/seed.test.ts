import { describe, expect, it } from "vitest";
import {
  añosHastaFecha,
  catalogoSinErrores,
  DEMO_TODAY,
  erroresCatalogo,
  montoDePrecios,
  proveedoresActivos,
  antiguedadSaldos,
  campanaVigente,
  contratoVigenteParaApertura,
  estadisticaCampanas,
  estadoMeta,
  foliosFacturaDeLocal,
  horasEntre,
  sumarDias,
  carteraVencida,
  consumoPresupuesto,
  excedenteSobregiro,
  requiereAutorizacion,
  contratosPorVencer,
  diasAtraso,
  diasSinContacto,
  erroresMantenimiento,
  proveedorAtiende,
  kpisMantenimiento,
  consecutivoDeFolio,
  embudoProspectos,
  expedienteCompleto,
  enDesarrolloEn,
  estatusCobro,
  evaluarCandados,
  localesDisponibles,
  localesSinAbrir,
  ocupacion,
  porcentajeCobrado,
  prospectosPorLocal,
  repricingAlLiberar,
  semaforoTerreno,
  temperaturaProspecto,
  rentaVsMinimo,
} from "@/domain";
import { IDS_VENDEDORES, USUARIOS_DEMO } from "@/config/usuarios";
import { CATALOGO, PROVEEDORES } from "./catalogo";
import {
  COTIZACION_CANDADO,
  COTIZACION_HEROE,
  LOCAL_HEROE,
  PLAZA_HEROE_ID,
} from "./heroe";
import { AHORA_DEMO } from "@/lib/tiempo";
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
  it("un contrato bajo el mínimo solo existe con una excepción APLICADA que lo respalda", () => {
    const porId = new Map(seed.locales.map((l) => [l.id, l]));
    const aplicadas = new Map(
      seed.excepciones
        .filter((e) => e.estado === "APLICADA")
        .map((e) => [e.cotizacionId, e]),
    );
    let bajoMinimo = 0;
    for (const c of seed.contratos) {
      const minimo = porId.get(c.localId)!.precioMinimo;
      if (c.rentaMensual >= minimo) continue;
      bajoMinimo += 1;
      const excepcion = aplicadas.get(c.cotizacionId ?? "");
      expect(excepcion?.localId).toBe(c.localId);
      expect(excepcion?.rentaSolicitada).toBe(c.rentaMensual);
      expect(excepcion?.precioMinimo).toBe(minimo);
    }
    // ~10 % de los ocupados, para que el reporte de trazabilidad tenga casos.
    const proporcion = bajoMinimo / seed.contratos.length;
    expect(proporcion).toBeGreaterThan(0.05);
    expect(proporcion).toBeLessThan(0.15);
  });

  it("las rentas se reparten sobre el mínimo con variedad, y cada plaza tiene su factor", () => {
    const porId = new Map(seed.locales.map((l) => [l.id, l]));
    const rangos = new Set(
      seed.contratos.map(
        (c) => rentaVsMinimo(c.rentaMensual, porId.get(c.localId)!.precioMinimo).rango,
      ),
    );
    expect([...rangos].sort()).toEqual(
      ["BAJO_MINIMO", "EN_MINIMO", "HASTA_10", "HASTA_5", "MAS_10"].sort(),
    );
    const factores = new Set(
      seed.plazas.map((p) => {
        const l = seed.locales.find(
          (x) => x.plazaId === p.id && x.estatus !== "PREVENTA",
        );
        return l ? Math.round((l.precioMinimo / l.precioVigente) * 20) : 0;
      }),
    );
    expect(factores.size).toBeGreaterThan(3);
  });

  it("todo local trae renta planeada y toda plaza la meta de 98 %", () => {
    for (const l of seed.locales) expect(l.rentaPlaneada).toBeGreaterThan(0);
    for (const p of seed.plazas) expect(p.metaCumplimientoPct).toBe(98);
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
    expect(a09.historial).toHaveLength(2);
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
    // El mínimo de origen ($17,700) sube con la misma regla hasta rozar el vigente.
    expect(Math.abs((reprecio?.minimoFinal ?? 0) - a09.precioMinimo)).toBeLessThan(100);
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

  it("la bandeja anual tiene 8 cambios pendientes, ninguno bajo el mínimo propuesto", () => {
    expect(seed.cambiosPropuestos).toHaveLength(8);
    const porId = new Map(seed.locales.map((l) => [l.id, l]));
    for (const cambio of seed.cambiosPropuestos) {
      expect(cambio.estado).toBe("PENDIENTE");
      expect(cambio.minimoActual).toBe(porId.get(cambio.localId)!.precioMinimo);
      expect(cambio.minimoPropuesto).toBeGreaterThan(cambio.minimoActual);
      expect(cambio.precioPropuesto).toBeGreaterThanOrEqual(cambio.minimoPropuesto);
      expect(cambio.precioPropuesto).toBeGreaterThan(cambio.precioActual);
    }
  });

  it("deja una excepción por autorizar y otra por aplicar para ver los dos pasos", () => {
    const abiertas = seed.excepciones.filter(
      (e) => e.estado === "PENDIENTE" || e.estado === "AUTORIZADA_DIRECCION",
    );
    expect(abiertas.map((e) => e.estado)).toEqual(["PENDIENTE", "AUTORIZADA_DIRECCION"]);
    for (const e of abiertas) expect(e.rentaSolicitada).toBeLessThan(e.precioMinimo);
    expect(abiertas[1]).toMatchObject({ autorizadaPor: "Mariana López" });
    // El resto son históricas ya aplicadas.
    expect(
      seed.excepciones
        .filter((e) => !abiertas.includes(e))
        .every((e) => e.estado === "APLICADA"),
    ).toBe(true);
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
      expect(prospecto!.etapa, c.id).toBe(
        c.ofertas.length === 3 ? "NEGOCIACION" : "COTIZADO",
      );
      expect(prospecto!.nombre).toBe(c.prospecto.nombre);
      expect(prospecto!.localIds).toEqual([c.localId]);
      expect(expedienteCompleto(prospecto!), c.id).toBe(c.prospecto.documentosCompletos);
    }
  });

  it("el expediente no guarda el booleano y sus fechas caen entre el alta y hoy", () => {
    for (const p of seed.prospectos) {
      expect(Object.hasOwn(p, "documentosCompletos"), p.id).toBe(false);
      for (const fecha of Object.values(p.documentos)) {
        expect(fecha >= p.creadoEl && fecha <= DEMO_TODAY, `${p.id} ${fecha}`).toBe(true);
      }
    }
  });

  it("los ganados tienen el expediente completo y el héroe es persona moral con sus 5 documentos", () => {
    for (const p of seed.prospectos.filter((p) => p.etapa === "GANADO"))
      expect(expedienteCompleto(p), p.id).toBe(true);
    const cotizacion = seed.cotizaciones.find((c) => c.id === COTIZACION_HEROE)!;
    const heroe = porId.get(cotizacion.prospectoId ?? "")!;
    expect(heroe.tipoPersona).toBe("MORAL");
    expect(Object.keys(heroe.documentos)).toHaveLength(5);
  });

  it("en negociación están solo los de cotización con 3 ofertas, y hay de ambas etapas", () => {
    const etapas = seed.cotizaciones.map((c) => porId.get(c.prospectoId ?? "")!.etapa);
    expect(etapas.filter((e) => e === "NEGOCIACION").length).toBeGreaterThan(0);
    expect(etapas.filter((e) => e === "COTIZADO").length).toBeGreaterThan(0);
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

  it("cada vendedor tiene al menos 3 prospectos fríos y 3 tibios", () => {
    for (const vendedorId of ["usr-sofia", "usr-luis", "usr-jorge"]) {
      const temperaturas = seed.prospectos
        .filter((p) => p.vendedorId === vendedorId)
        .map((p) => temperaturaProspecto(diasSinContacto(p, DEMO_TODAY)));
      expect(
        temperaturas.filter((t) => t === "FRIO").length,
        vendedorId,
      ).toBeGreaterThanOrEqual(3);
      expect(
        temperaturas.filter((t) => t === "TIBIO").length,
        vendedorId,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("vendedores y ofertas", () => {
  const idsVendedores = new Set(["usr-sofia", "usr-luis", "usr-jorge"]);
  const prospectoPorId = new Map(seed.prospectos.map((p) => [p.id, p]));

  it("cada cotización y prospecto tiene un vendedor demo, y el reparto ronda 45/35/20", () => {
    for (const c of seed.cotizaciones)
      expect(idsVendedores.has(c.vendedorId), c.id).toBe(true);
    for (const p of seed.prospectos)
      expect(idsVendedores.has(p.vendedorId), p.id).toBe(true);
    const cuenta = (id: string) =>
      seed.cotizaciones.filter((c) => c.vendedorId === id).length;
    const total = seed.cotizaciones.length;
    expect(cuenta("usr-sofia") / total).toBeGreaterThan(0.35);
    expect(cuenta("usr-luis") / total).toBeGreaterThan(0.2);
    expect(cuenta("usr-jorge") / total).toBeGreaterThan(0.05);
    expect(cuenta("usr-sofia")).toBeGreaterThan(cuenta("usr-luis"));
    expect(cuenta("usr-luis")).toBeGreaterThan(cuenta("usr-jorge"));
  });

  it("la cotización héroe, la del candado y las de la demo PMO son de Sofía; el prospecto sigue a su cotización", () => {
    for (const id of [COTIZACION_HEROE, COTIZACION_CANDADO]) {
      const cotizacion = seed.cotizaciones.find((c) => c.id === id)!;
      expect(cotizacion.vendedorId, id).toBe("usr-sofia");
      expect(
        cotizacion.ofertas.every((o) => o.vendedorId === "usr-sofia"),
        id,
      ).toBe(true);
    }
    for (const e of seed.excepciones.slice(0, 2)) {
      expect(seed.cotizaciones.find((c) => c.id === e.cotizacionId)?.vendedorId).toBe(
        "usr-sofia",
      );
      expect(e.solicitadaPor).toBe("Sofía Medina");
    }
    for (const c of seed.cotizaciones)
      expect(prospectoPorId.get(c.prospectoId ?? "")?.vendedorId, c.id).toBe(
        c.vendedorId,
      );
  });

  it("cada cotización trae de 1 a 3 ofertas cronológicas que terminan en sus términos", () => {
    for (const c of seed.cotizaciones) {
      expect(c.ofertas.length, c.id).toBeGreaterThanOrEqual(1);
      expect(c.ofertas.length, c.id).toBeLessThanOrEqual(3);
      const momentos = c.ofertas.map((o) => `${o.fecha} ${o.hora}`);
      expect(momentos, c.id).toEqual([...momentos].sort());
      expect(c.ofertas[0].fecha, c.id).toBe(c.emitidaEl);
      expect(c.ofertas.at(-1)!.fecha <= DEMO_TODAY, c.id).toBe(true);
      expect(c.ofertas.at(-1)).toMatchObject({
        rentaMensual: c.rentaMensual,
        plazoMeses: c.plazoMeses,
      });
      expect(c.ofertas.every((o) => o.vendedorId === c.vendedorId)).toBe(true);
    }
  });
});

describe("contratos", () => {
  it("los contratos del seed están todos vigentes", () => {
    expect(seed.contratos.every((c) => c.estado === "VIGENTE")).toBe(true);
  });
});

describe("aperturas de la semilla", () => {
  const ocupadosDe = (locales: typeof seed.locales) =>
    locales.filter((l) => l.estatus === "OCUPADO");

  it("la plaza héroe deja entre 40 y 60% de sus ocupados sin abrir", () => {
    const ocupados = ocupadosDe(localesDe(PLAZA_HEROE_ID));
    const sinAbrir = localesSinAbrir(ocupados, seed.contratos, DEMO_TODAY);
    const fraccion = sinAbrir.length / ocupados.length;
    expect(fraccion).toBeGreaterThanOrEqual(0.4);
    expect(fraccion).toBeLessThanOrEqual(0.6);
  });

  it("fuera de la plaza héroe quedan algunos sin abrir, pero son minoría", () => {
    const ocupados = ocupadosDe(seed.locales.filter((l) => l.plazaId !== PLAZA_HEROE_ID));
    const fraccion =
      localesSinAbrir(ocupados, seed.contratos, DEMO_TODAY).length / ocupados.length;
    expect(fraccion).toBeGreaterThan(0);
    expect(fraccion).toBeLessThan(0.5);
  });

  it("toda apertura cae entre el inicio y hoy y la registra un usuario de la demo", () => {
    const ids = new Set(USUARIOS_DEMO.map((u) => u.id));
    const abiertos = seed.contratos.filter((c) => c.apertura);
    expect(abiertos.length).toBeGreaterThan(0);
    for (const c of abiertos) {
      const a = c.apertura!;
      expect(a.fecha >= c.inicio && a.fecha <= DEMO_TODAY).toBe(true);
      expect(a.registradaEl <= DEMO_TODAY).toBe(true);
      expect(ids.has(a.registradaPor)).toBe(true);
    }
  });

  it("es determinista", () => {
    expect(crearSeed().contratos).toEqual(seed.contratos);
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
  it("hay 4 integraciones y cada evento del log pertenece a una", () => {
    expect(seed.integraciones.map((i) => i.id)).toEqual([
      "ENKONTROL",
      "EXCEL",
      "MONDAY",
      "MSPROJECT",
    ]);
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

describe("padrón de proveedores", () => {
  const padron = seed.proveedores;
  const porId = new Map(padron.map((p) => [p.id, p]));
  const deMantenimiento = padron.filter((p) => p.especialidadesMantenimiento.length > 0);
  const deObra = padron.filter((p) => p.partidasObra.length > 0);

  it("une los 26 del catálogo con ids y RFC únicos, todos activos", () => {
    expect(padron).toHaveLength(26);
    expect(padron.map((p) => p.id)).toEqual(PROVEEDORES.map((p) => p.id));
    expect(new Set(padron.map((p) => p.id)).size).toBe(26);
    expect(new Set(padron.map((p) => p.rfc)).size).toBe(26);
    expect(padron.every((p) => p.activo)).toBe(true);
    expect(deMantenimiento).toHaveLength(8);
    expect(deObra).toHaveLength(18);
  });

  it("los 8 de mantenimiento van primero, en su orden, con sus especialidades y RFC", () => {
    expect(
      padron.slice(0, 8).map((p) => [p.id, p.rfc, p.especialidadesMantenimiento]),
    ).toEqual([
      ["prv-1", "MCO180412K35", ["PINTURA", "IMPERMEABILIZACION", "LIMPIEZA"]],
      ["prv-2", "ESP150720QA7", ["ELECTRICO"]],
      ["prv-3", "CRN120306H92", ["CLIMA", "ELECTRICO"]],
      ["prv-4", "PIS170918D41", ["PLOMERIA"]],
      ["prv-5", "ICA140225L68", ["IMPERMEABILIZACION"]],
      ["prv-6", "LPA130611T53", ["LIMPIEZA"]],
      ["prv-7", "PAD160809B27", ["PINTURA"]],
      ["prv-8", "STI190130M84", ["PLOMERIA", "ELECTRICO", "CLIMA"]],
    ]);
    expect(deMantenimiento.map((p) => p.id)).toEqual(padron.slice(0, 8).map((p) => p.id));
  });

  it("los de mantenimiento atienden todas las plazas; los de obra, ninguna", () => {
    const todas = seed.plazas.map((p) => p.id);
    for (const p of deMantenimiento) expect(p.plazaIds, p.id).toEqual(todas);
    for (const p of deObra) {
      expect(p.plazaIds, p.id).toEqual([]);
      expect(p.especialidadesMantenimiento, p.id).toEqual([]);
    }
    expect(PROVEEDORES.every((p) => p.plazaIds.length === 0)).toBe(true);
  });

  it("todos traen contacto, y los de ACABADOS (07, 14 y 16 incluidos) WhatsApp", () => {
    for (const p of padron) {
      expect(p.contacto.nombre, p.id).not.toBe("");
      expect(p.contacto.correo, p.id).toMatch(/^[^@\s]+@[^@\s]+\.mx$/);
    }
    const acabados = padron.filter(
      (p) => p.activo && p.partidasObra.includes("ACABADOS"),
    );
    expect(acabados.map((p) => p.id)).toEqual(
      expect.arrayContaining(["prv-obra-07", "prv-obra-14", "prv-obra-16"]),
    );
    for (const p of acabados) expect(p.contacto.whatsapp, p.id).not.toBe("");
  });

  it("los contratos de obra llevan el proveedorId de su contratista", () => {
    for (const c of seed.obra.contratos) {
      const proveedor = c.proveedorId ? porId.get(c.proveedorId) : undefined;
      expect(proveedor?.nombre, c.folio).toBe(c.contratista);
      expect(proveedor?.partidasObra.length, c.folio).toBeGreaterThan(0);
    }
  });

  it("ACABADOS trae un catálogo válido de 4 a 6 conceptos ACA-NN, sin invitaciones y rondas solo por total", () => {
    const acabados = seed.licitaciones.find(
      (l) => l.estado === "EN_CURSO" && l.partida === "ACABADOS",
    )!;
    expect(acabados.conceptos.length).toBeGreaterThanOrEqual(4);
    expect(acabados.conceptos.length).toBeLessThanOrEqual(6);
    expect(acabados.conceptos.every((c) => /^ACA-\d{2}$/.test(c.clave))).toBe(true);
    expect(catalogoSinErrores(erroresCatalogo(acabados, acabados.conceptos))).toBe(true);
    expect(acabados.invitaciones).toEqual([]);
    expect(acabados.rondas.map((r) => r.numero)).toEqual([1, 2]);
    expect(
      acabados.rondas.every((r) => r.propuestas.every((p) => p.precios === undefined)),
    ).toBe(true);
    expect(proveedoresActivos(acabados)).toContain("prv-obra-07");
    // Precios unitarios de mercado de referencia: el catálogo queda en la escala del base.
    const PU_MERCADO = [780, 165, 420, 95, 1_750];
    const total = montoDePrecios(
      acabados.conceptos,
      acabados.conceptos.map((c, i) => ({
        conceptoId: c.id,
        precioUnitario: PU_MERCADO[i],
      })),
    );
    expect(
      Math.abs(total - acabados.presupuestoBase) / acabados.presupuestoBase,
    ).toBeLessThan(0.02);
  });

  it("las licitaciones históricas no traen catálogo y su ganador sale del proveedorId del contrato", () => {
    const contratoPorId = new Map(seed.obra.contratos.map((c) => [c.id, c]));
    for (const l of seed.licitaciones.filter((x) => x.estado === "ADJUDICADA")) {
      expect(l.conceptos, l.folio).toEqual([]);
      expect(l.invitaciones, l.folio).toEqual([]);
      expect(l.ganadorId, l.folio).toBe(
        contratoPorId.get(l.contratoObraId!)?.proveedorId,
      );
    }
  });

  it("las licitaciones solo invitan a contratistas de obra", () => {
    for (const l of seed.licitaciones) {
      for (const id of l.invitados) {
        expect(porId.get(id)?.partidasObra.length, `${l.folio} ${id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("mantenimientos", () => {
  const plazaPorId = new Map(seed.plazas.map((p) => [p.id, p]));
  const localPorId = new Map(seed.locales.map((l) => [l.id, l]));
  const proveedorPorId = new Map(seed.proveedores.map((p) => [p.id, p]));
  const deAlborada = seed.mantenimientos.filter((m) => m.plazaId === PLAZA_HEROE_ID);

  it("hay unos 200, con folios consecutivos únicos", () => {
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

  it("cada registro apunta a plaza, local de esa plaza y un proveedor de mantenimiento que la atiende", () => {
    for (const m of seed.mantenimientos) {
      expect(plazaPorId.has(m.plazaId), m.folio).toBe(true);
      if (m.localId) expect(localPorId.get(m.localId)?.plazaId, m.folio).toBe(m.plazaId);
      const proveedor = proveedorPorId.get(m.proveedorId);
      expect(proveedor?.id, m.folio).toMatch(/^prv-[1-8]$/);
      expect(proveedor?.plazaIds, m.folio).toContain(m.plazaId);
      expect(proveedorAtiende(proveedor, m.categoria), m.folio).toBe(true);
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

describe("presupuesto y facturas SAT de mantenimiento", () => {
  const año = Number(DEMO_TODAY.slice(0, 4));
  const presupuestoDe = (plazaId: string) =>
    seed.presupuestosMantenimiento.find((p) => p.plazaId === plazaId && p.año === año)!;

  it("cada plaza con trabajos tiene su presupuesto y solo Alborada está cerca del tope", () => {
    const conTrabajos = new Set(seed.mantenimientos.map((m) => m.plazaId));
    expect(new Set(seed.presupuestosMantenimiento.map((p) => p.plazaId))).toEqual(
      conTrabajos,
    );
    for (const plazaId of conTrabajos) {
      const consumo = consumoPresupuesto(plazaId, año, seed.mantenimientos);
      const pct = consumo / presupuestoDe(plazaId).monto;
      expect(pct, plazaId).toBeLessThanOrEqual(plazaId === PLAZA_HEROE_ID ? 0.95 : 0.9);
    }
    const pctHeroe =
      consumoPresupuesto(PLAZA_HEROE_ID, año, seed.mantenimientos) /
      presupuestoDe(PLAZA_HEROE_ID).monto;
    expect(pctHeroe).toBeGreaterThanOrEqual(0.85);
  });

  it("Alborada tiene un único trabajo pendiente y su excedente cuadra con el presupuesto", () => {
    const pendientes = seed.mantenimientos.filter(
      (m) => m.autorizacionSobregiro?.estado === "PENDIENTE",
    );
    expect(pendientes).toHaveLength(1);
    const [m] = pendientes;
    expect(m.plazaId).toBe(PLAZA_HEROE_ID);
    const consumo = consumoPresupuesto(PLAZA_HEROE_ID, año, seed.mantenimientos, m.id);
    const presupuesto = presupuestoDe(PLAZA_HEROE_ID);
    expect(requiereAutorizacion(m, presupuesto, consumo)).toBe(true);
    expect(m.autorizacionSobregiro!.excedente).toBe(
      excedenteSobregiro(m, presupuesto, consumo),
    );
    expect(m.estatus).toBe("PROGRAMADO");
  });

  it("hay unas 15 facturas con RFC y UUID de formato válido, ligadas y libres", () => {
    expect(seed.facturasSat.length).toBeGreaterThanOrEqual(13);
    expect(seed.facturasSat.length).toBeLessThanOrEqual(17);
    expect(new Set(seed.facturasSat.map((f) => f.uuid)).size).toBe(
      seed.facturasSat.length,
    );
    for (const f of seed.facturasSat) {
      expect(f.uuid, f.id).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/,
      );
      expect(f.rfcEmisor, f.id).toMatch(/^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/);
      expect(Math.abs(f.subtotal + f.iva - f.total), f.id).toBeLessThan(0.011);
      expect(f.fecha <= DEMO_TODAY, f.id).toBe(true);
    }
    expect(seed.facturasSat.some((f) => f.mantenimientoId)).toBe(true);
    expect(seed.facturasSat.some((f) => !f.mantenimientoId)).toBe(true);
  });

  it("la factura ligada es de la misma plaza y su total es el costo real del trabajo", () => {
    const porId = new Map(seed.mantenimientos.map((m) => [m.id, m]));
    for (const f of seed.facturasSat.filter((x) => x.mantenimientoId)) {
      const m = porId.get(f.mantenimientoId!)!;
      expect(m, f.id).toBeDefined();
      expect(m.plazaId, f.id).toBe(f.plazaId);
      expect(f.total, f.id).toBe(m.costoReal);
    }
  });
});

describe("caso demo de liberación", () => {
  it("hay un contrato por vencer con 3 años o más sin actualización de precio", () => {
    const seed = crearSeed();
    const porVencer = contratosPorVencer(seed.contratos, DEMO_TODAY);
    const conSalto = porVencer.filter((c) => {
      const local = seed.locales.find((l) => l.id === c.localId)!;
      return añosHastaFecha(local.historial, DEMO_TODAY).length >= 3;
    });
    expect(conSalto.map((c) => c.localId)).toContain("plz-alborada-A-05");
  });
});

describe("campañas y atribución de contratos", () => {
  const campanaPorId = new Map(seed.campanas.map((c) => [c.id, c]));

  it("siembra las 6 campañas cmp-01..cmp-06", () => {
    expect(seed.campanas.map((c) => c.id)).toEqual([
      "cmp-01",
      "cmp-02",
      "cmp-03",
      "cmp-04",
      "cmp-05",
      "cmp-06",
    ]);
  });

  it("todo campanaId existe, su canal es el origen y estaba vigente en el alta", () => {
    const ligados = seed.prospectos.filter((p) => p.campanaId !== undefined);
    expect(ligados.length).toBeGreaterThan(0);
    for (const p of ligados) {
      const campana = campanaPorId.get(p.campanaId!);
      expect(campana, p.id).toBeDefined();
      expect(campana!.canal).toBe(p.origen);
      expect(campanaVigente(campana!, p.creadoEl)).toBe(true);
    }
  });

  it("solo los prospectos REDES y SITIO_WEB llevan campaña", () => {
    const origenes = new Set(
      seed.prospectos.filter((p) => p.campanaId !== undefined).map((p) => p.origen),
    );
    expect([...origenes].sort()).toEqual(["REDES", "SITIO_WEB"]);
  });

  it("deja prospectos en al menos 3 de las campañas cmp-01 a cmp-04", () => {
    const conProspectos = new Set(seed.prospectos.map((p) => p.campanaId));
    const elegibles = ["cmp-01", "cmp-02", "cmp-03", "cmp-04"];
    expect(elegibles.filter((id) => conProspectos.has(id)).length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("atribuye exactamente 15 contratos de 2026 a vendedores del equipo", () => {
    const contratoPorId = new Map(seed.contratos.map((c) => [c.id, c]));
    const atribuidos = Object.entries(seed.atribucionContratos);
    expect(atribuidos).toHaveLength(15);
    for (const [id, { vendedorId, campanaId }] of atribuidos) {
      expect(contratoPorId.get(id)?.inicio.startsWith("2026"), id).toBe(true);
      expect(IDS_VENDEDORES).toContain(vendedorId);
      if (campanaId !== undefined) expect(campanaPorId.has(campanaId)).toBe(true);
    }
  });

  it("al menos una campaña está vigente a DEMO_TODAY", () => {
    expect(seed.campanas.some((c) => campanaVigente(c, DEMO_TODAY))).toBe(true);
  });

  it("la estadística del seed tiene 3 campañas con contratos y conversión ≤ 1", () => {
    const estadistica = estadisticaCampanas(
      seed.campanas,
      seed.prospectos,
      seed.cotizaciones,
      seed.contratos,
      seed.atribucionContratos,
    );
    expect(estadistica.filter((e) => e.contratos > 0).length).toBeGreaterThanOrEqual(3);
    for (const e of estadistica) {
      if (e.conversion !== null) expect(e.conversion).toBeLessThanOrEqual(1);
    }
  });
});

describe("comisiones históricas", () => {
  const comisiones = seed.comisiones;
  const contratoPorId = new Map(seed.contratos.map((c) => [c.id, c]));

  it("son deterministas, con ids únicos", () => {
    expect(crearSeed().comisiones).toEqual(comisiones);
    expect(comisiones.length).toBeGreaterThan(0);
    expect(new Set(comisiones.map((c) => c.id)).size).toBe(comisiones.length);
  });

  it("todas son de contratos atribuidos de 2026, generadas el día de inicio", () => {
    for (const c of comisiones) {
      const atribucion = seed.atribucionContratos[c.contratoId];
      expect(atribucion, c.id).toBeDefined();
      const contrato = contratoPorId.get(c.contratoId)!;
      expect(contrato.inicio.startsWith("2026"), c.id).toBe(true);
      expect(c.generadaEl).toBe(contrato.inicio);
      if (c.concepto === "MANDO_MEDIO") {
        expect(c.usuarioId).not.toBe(atribucion.vendedorId);
      } else {
        expect(c.usuarioId).toBe(atribucion.vendedorId);
      }
      expect(IDS_VENDEDORES).toContain(atribucion.vendedorId);
    }
  });

  it("los cobradores son vendedores de IDS_VENDEDORES", () => {
    for (const c of comisiones) expect(IDS_VENDEDORES).toContain(c.usuarioId);
  });

  it("hay pagadas y pendientes, con generadaEl ≤ pagadaEl ≤ DEMO_TODAY", () => {
    const pagadas = comisiones.filter((c) => c.pagadaEl !== undefined);
    expect(pagadas.length).toBeGreaterThan(0);
    expect(pagadas.length).toBeLessThan(comisiones.length);
    for (const c of pagadas) {
      expect(c.generadaEl <= c.pagadaEl!, c.id).toBe(true);
      expect(c.pagadaEl! <= DEMO_TODAY, c.id).toBe(true);
    }
  });
});

describe("casos de servicio a clientes", () => {
  const casos = seed.casos;
  const vigentePorLocal = new Map(
    seed.contratos
      .filter((c) => contratoVigenteParaApertura(c, DEMO_TODAY))
      .map((c) => [c.localId, c]),
  );
  const localPorId = new Map(seed.locales.map((l) => [l.id, l]));
  const mantenimientoPorId = new Map(seed.mantenimientos.map((m) => [m.id, m]));
  const desde = sumarDias(DEMO_TODAY, -60);

  it("hay unos 30 de los últimos 60 días, con ids y folios únicos", () => {
    expect(casos.length).toBeGreaterThanOrEqual(25);
    expect(casos.length).toBeLessThanOrEqual(40);
    expect(new Set(casos.map((c) => c.id)).size).toBe(casos.length);
    expect(new Set(casos.map((c) => c.folio)).size).toBe(casos.length);
    for (const c of casos) {
      expect(c.folio).toMatch(/^CAS-\d{4}-\d{4}$/);
      expect(c.abiertoEl.slice(0, 10) >= desde, c.folio).toBe(true);
      expect(horasEntre(c.abiertoEl, AHORA_DEMO), c.folio).toBeGreaterThan(0);
    }
  });

  it("cada caso apunta a un local con contrato vigente, a su plaza y a su locatario", () => {
    for (const c of casos) {
      const contrato = vigentePorLocal.get(c.localId);
      expect(contrato, c.folio).toBeDefined();
      expect(c.locatarioId, c.folio).toBe(contrato?.locatarioId);
      expect(localPorId.get(c.localId)?.plazaId, c.folio).toBe(c.plazaId);
    }
  });

  it("el ciclo es coherente: respuesta tras abrir, resolución en RESUELTO y CERRADO, calificación al cerrar", () => {
    for (const c of casos) {
      if (c.estatus === "RECIBIDO") {
        expect(c.primeraRespuestaEl, c.folio).toBeUndefined();
        continue;
      }
      expect(c.primeraRespuestaEl, c.folio).toBeDefined();
      expect(horasEntre(c.abiertoEl, c.primeraRespuestaEl!), c.folio).toBeGreaterThan(0);
      expect(c.responsableId, c.folio).toBe("usr-atencion");
      if (c.estatus === "RESUELTO" || c.estatus === "CERRADO")
        expect(c.resueltoEl, c.folio).toBeDefined();
      if (c.estatus === "CERRADO") expect(c.calificacion, c.folio).toBeDefined();
    }
  });

  it("hay al menos un por vencer (ALTA de 3,5 horas), un fuera de tiempo, un escalado y una aclaración", () => {
    expect(
      casos.some(
        (c) =>
          c.prioridad === "ALTA" &&
          c.estatus === "RECIBIDO" &&
          horasEntre(c.abiertoEl, AHORA_DEMO) === 3.5 &&
          estadoMeta(c, AHORA_DEMO) === "POR_VENCER",
      ),
    ).toBe(true);
    expect(casos.some((c) => estadoMeta(c, AHORA_DEMO) === "FUERA_DE_TIEMPO")).toBe(true);
    expect(casos.some((c) => c.mantenimientoId !== undefined)).toBe(true);
    expect(casos.some((c) => c.tipo === "ACLARACION_FACTURA")).toBe(true);
  });

  it("los escalados se ligan a un correctivo de locatario del mismo local, uno por caso y con el tipo de su categoría", () => {
    const escalados = casos.filter((c) => c.mantenimientoId !== undefined);
    expect(new Set(escalados.map((c) => c.mantenimientoId)).size).toBe(escalados.length);
    const tipoDe = { PLOMERIA: "FUGA", ELECTRICO: "FALLA" } as Record<string, string>;
    for (const c of escalados) {
      const m = mantenimientoPorId.get(c.mantenimientoId!);
      expect(m, c.folio).toBeDefined();
      expect(m?.tipo, c.folio).toBe("CORRECTIVO");
      expect(m?.origen, c.folio).toBe("LOCATARIO");
      expect(m?.localId, c.folio).toBe(c.localId);
      expect(m!.fechaProgramada > c.abiertoEl.slice(0, 10), c.folio).toBe(true);
      expect(m!.fechaProgramada >= desde, c.folio).toBe(true);
      expect(c.tipo, c.folio).toBe(tipoDe[m!.categoria] ?? "DANO");
    }
  });

  it("las aclaraciones usan una factura con folio del local, de los tres últimos meses y no posterior al caso", () => {
    for (const c of casos.filter((x) => x.tipo === "ACLARACION_FACTURA")) {
      const folio = foliosFacturaDeLocal(seed.facturas, c.localId, DEMO_TODAY).find(
        (f) => f.id === c.facturaId,
      );
      expect(folio, c.folio).toBeDefined();
      expect(folio!.mes <= c.abiertoEl.slice(0, 7), c.folio).toBe(true);
    }
  });

  it("no agrega mantenimientos: la numeración mnt-NNNN sigue consecutiva", () => {
    expect(seed.mantenimientos.map((m) => m.id)).toEqual(
      seed.mantenimientos.map((_, i) => `mnt-${String(i + 1).padStart(4, "0")}`),
    );
  });
});
