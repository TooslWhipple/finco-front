import { describe, expect, it } from "vitest";
import { crearSeed } from "@/data/seed";
import { contratoDesdeCotizacion, evaluarCandados, DEMO_TODAY } from "@/domain";
import type { Cotizacion, ReglaActualizacion } from "@/domain";
import * as r from "./reducers";

const seed = crearSeed();
const cotA09 = seed.cotizaciones.find((c) => c.id === "COT-2026-0418") as Cotizacion;
const localA09 = seed.locales.find((l) => l.id === cotA09.localId)!;

const aprobaciones = (): r.AprobacionesState => ({
  excepciones: seed.excepciones,
  cambiosAnuales: seed.cambiosPropuestos,
});

describe("excepciones de precio", () => {
  it("solicitar crea una pendiente y no duplica la abierta", () => {
    const uno = r.solicitarExcepcion(
      aprobaciones(),
      cotA09,
      localA09,
      "Jorge Ramírez",
      "Cliente ancla",
    );
    expect(uno.excepciones).toHaveLength(seed.excepciones.length + 1);
    const nueva = uno.excepciones.at(-1)!;
    expect(nueva).toMatchObject({
      estado: "PENDIENTE",
      cotizacionId: cotA09.id,
      rentaSolicitada: cotA09.rentaMensual,
      precioMinimo: localA09.precioMinimo,
      motivo: "Cliente ancla",
    });
    expect(r.solicitarExcepcion(uno, cotA09, localA09, "Jorge", "otra")).toBe(uno);
  });

  it("aprobar desbloquea el candado de precio mínimo", () => {
    const pedida = r.solicitarExcepcion(aprobaciones(), cotA09, localA09, "J", "m");
    const id = pedida.excepciones.at(-1)!.id;
    const antes = evaluarCandados(
      cotA09,
      localA09,
      DEMO_TODAY,
      pedida.excepciones.at(-1),
    );
    expect(antes.find((c) => c.id === "PRECIO_MINIMO")?.estado).toBe("FALLA");

    const resuelta = r.resolverExcepcion(pedida, id, "APROBADA", "Laura Fuentes");
    const exc = resuelta.excepciones.find((e) => e.id === id)!;
    expect(exc).toMatchObject({ estado: "APROBADA", resueltaPor: "Laura Fuentes" });
    const despues = evaluarCandados(cotA09, localA09, DEMO_TODAY, exc);
    expect(despues.find((c) => c.id === "PRECIO_MINIMO")?.estado).toBe("EXCEPCION");
  });

  it("rechazar exige comentario y solo mueve pendientes", () => {
    const pedida = r.solicitarExcepcion(aprobaciones(), cotA09, localA09, "J", "m");
    const id = pedida.excepciones.at(-1)!.id;
    expect(() => r.resolverExcepcion(pedida, id, "RECHAZADA", "L", "  ")).toThrow();
    const rechazada = r.resolverExcepcion(pedida, id, "RECHAZADA", "L", "Fuera de rango");
    expect(rechazada.excepciones.find((e) => e.id === id)).toMatchObject({
      estado: "RECHAZADA",
      comentario: "Fuera de rango",
    });
    const reintento = r.resolverExcepcion(rechazada, id, "APROBADA", "L");
    expect(reintento.excepciones.find((e) => e.id === id)?.estado).toBe("RECHAZADA");
  });

  it("cuenta las pendientes para el badge", () => {
    const base = aprobaciones();
    const pendientes = r.contarExcepcionesPendientes(base);
    const mas = r.solicitarExcepcion(base, cotA09, localA09, "J", "m");
    expect(r.contarExcepcionesPendientes(mas)).toBe(pendientes + 1);
  });
});

describe("bandeja de actualización anual", () => {
  it("aprobar 6 baja el contador de pendientes en 6", () => {
    const base = aprobaciones();
    const total = r.contarCambiosPendientes(base);
    const ids = base.cambiosAnuales.slice(0, 6).map((c) => c.localId);
    const despues = r.resolverCambiosAnuales(base, ids, 2027, "APROBADO");
    expect(r.contarCambiosPendientes(despues)).toBe(total - Math.min(6, total));
    expect(
      despues.cambiosAnuales.filter((c) => c.estado === "APROBADO").length,
    ).toBeGreaterThan(0);
    // idempotente sobre lo ya resuelto
    expect(r.resolverCambiosAnuales(despues, ids, 2027, "RECHAZADO")).toEqual(despues);
  });
});

describe("cotizaciones", () => {
  it("agrega sin duplicar y actualiza por id", () => {
    const base = { cotizaciones: seed.cotizaciones };
    const nueva: Cotizacion = { ...cotA09, id: "COT-2026-9999" };
    const con = r.agregarCotizacion(base, nueva);
    expect(con.cotizaciones).toHaveLength(base.cotizaciones.length + 1);
    expect(r.agregarCotizacion(con, nueva)).toBe(con);
    const hecha = r.actualizarCotizacion(con, nueva.id, { estado: "CONTRATO_GENERADO" });
    expect(hecha.cotizaciones.find((c) => c.id === nueva.id)?.estado).toBe(
      "CONTRATO_GENERADO",
    );
    expect(hecha.cotizaciones.find((c) => c.id === cotA09.id)).toEqual(cotA09);
  });
});

describe("cobranza, integraciones y locales", () => {
  it("registra seguimientos y avisos", () => {
    const base: r.CobranzaState = { seguimientos: {}, avisados: [] };
    const uno = r.registrarSeguimiento(base, "f1", "Recordatorio 3 nov");
    expect(uno.seguimientos).toEqual({ f1: ["Recordatorio 3 nov"] });
    const avisos = r.registrarAvisos(uno, ["f1", "f2"], "Aviso enviado");
    expect(avisos.avisados).toEqual(["f1", "f2"]);
    expect(avisos.seguimientos.f2).toEqual(["Aviso enviado"]);
    expect(avisos.seguimientos.f1).toEqual(["Recordatorio 3 nov", "Aviso enviado"]);
  });

  it("registra el sync de una integración y suma al log sin tocar las demás", () => {
    const inicial: r.IntegracionesState = {
      sincronizaciones: {},
      eventos: seed.eventosSync,
    };
    const est = r.registrarSync(inicial, {
      integracionId: "MONDAY",
      fecha: "2026-11-03T10:00:00",
      resultado: "OK",
      detalle: "Manual",
      registros: 14,
    });
    expect(est.sincronizaciones).toEqual({ MONDAY: "2026-11-03T10:00:00" });
    expect(est.eventos).toHaveLength(seed.eventosSync.length + 1);
    expect(est.eventos.at(-1)).toMatchObject({ integracionId: "MONDAY", registros: 14 });
    expect(new Set(est.eventos.map((e) => e.id)).size).toBe(est.eventos.length);
  });

  it("los ajustes de local se acumulan y se aplican sin mutar el original", () => {
    let est: r.LocalesState = { ajustes: {} };
    est = r.ajustarLocal(est, localA09.id, { precioMinimo: 25000 });
    est = r.ajustarLocal(est, localA09.id, { precioVigente: 26000 });
    const ajustado = r.aplicarAjuste(localA09, est.ajustes[localA09.id]);
    expect(ajustado).toMatchObject({ precioMinimo: 25000, precioVigente: 26000 });
    expect(localA09.precioMinimo).not.toBe(25000);
    expect(r.aplicarAjuste(localA09, undefined)).toBe(localA09);
  });
});

describe("prospectos", () => {
  const base = (): r.ProspectosState => ({ prospectos: seed.prospectos });
  const nuevo = seed.prospectos.find((p) => p.etapa === "NUEVO")!;

  it("registrar agrega y no duplica", () => {
    const alta = { ...nuevo, id: "pro-999" };
    const uno = r.registrarProspecto(base(), alta);
    expect(uno.prospectos).toHaveLength(seed.prospectos.length + 1);
    expect(r.registrarProspecto(uno, alta)).toBe(uno);
  });

  it("avanzar pasa a la siguiente etapa y deja constancia en la actividad", () => {
    const est = r.avanzarProspecto(base(), nuevo.id, DEMO_TODAY);
    const p = est.prospectos.find((x) => x.id === nuevo.id)!;
    expect(p.etapa).toBe("CONTACTADO");
    expect(p.actividad).toHaveLength(nuevo.actividad.length + 1);
    expect(p.actividad.at(-1)).toMatchObject({
      titulo: "Avanzó a Contactado",
      fecha: DEMO_TODAY,
    });
  });

  it("un prospecto ganado o perdido ya no avanza ni se descarta", () => {
    const ganado = seed.prospectos.find((p) => p.etapa === "GANADO")!;
    expect(r.avanzarProspecto(base(), ganado.id, DEMO_TODAY).prospectos).toEqual(
      seed.prospectos,
    );
    expect(r.descartarProspecto(base(), ganado.id, DEMO_TODAY).prospectos).toEqual(
      seed.prospectos,
    );
  });

  it("descartar marca perdido a un prospecto vivo", () => {
    const est = r.descartarProspecto(base(), nuevo.id, DEMO_TODAY);
    expect(est.prospectos.find((x) => x.id === nuevo.id)?.etapa).toBe("PERDIDO");
  });
});

describe("contratos", () => {
  const borrador = contratoDesdeCotizacion(cotA09);

  it("agregar no duplica", () => {
    const est = r.agregarContrato({ nuevos: [] }, borrador);
    expect(est.nuevos).toEqual([borrador]);
    expect(r.agregarContrato(est, borrador)).toBe(est);
  });

  it("recorre borrador, en firma y vigente en orden", () => {
    let est = r.agregarContrato({ nuevos: [] }, borrador);
    est = r.registrarFirma(est, borrador.id);
    expect(est.nuevos[0].estado).toBe("BORRADOR");
    est = r.enviarAFirma(est, borrador.id);
    expect(est.nuevos[0].estado).toBe("EN_FIRMA");
    est = r.enviarAFirma(est, borrador.id);
    expect(est.nuevos[0].estado).toBe("EN_FIRMA");
    est = r.registrarFirma(est, borrador.id);
    expect(est.nuevos[0].estado).toBe("VIGENTE");
  });
});

describe("terrenos", () => {
  const base = (): r.TerrenosState => ({ terrenos: seed.terrenos });
  const terreno = seed.terrenos.find((t) => t.etapa === "CONSTRUCCION")!;

  it("mover de etapa reinicia el avance; abrir lo deja en 100", () => {
    const est = r.moverEtapaTerreno(base(), terreno.id, "PREVENTA");
    expect(est.terrenos.find((t) => t.id === terreno.id)).toMatchObject({
      etapa: "PREVENTA",
      avancePct: 0,
    });
    const abierto = r.moverEtapaTerreno(est, terreno.id, "ABIERTO");
    expect(abierto.terrenos.find((t) => t.id === terreno.id)?.avancePct).toBe(100);
  });

  it("mover a la misma etapa no pierde el avance", () => {
    expect(r.moverEtapaTerreno(base(), terreno.id, terreno.etapa).terrenos).toEqual(
      seed.terrenos,
    );
  });

  it("el avance se acota entre 0 y 100", () => {
    const alto = r.actualizarAvanceTerreno(base(), terreno.id, 180);
    expect(alto.terrenos.find((t) => t.id === terreno.id)?.avancePct).toBe(100);
    const bajo = r.actualizarAvanceTerreno(base(), terreno.id, -5);
    expect(bajo.terrenos.find((t) => t.id === terreno.id)?.avancePct).toBe(0);
  });
});

describe("reglas por default", () => {
  const regla: ReglaActualizacion = {
    tipo: "VALOR_FIJO",
    porcentajeFijo: 5,
    cuando: "ENERO",
    modo: "AUTOMATICO",
  };

  it("establecer la regla la aplica a la plaza sin mutar el original", () => {
    const plaza = seed.plazas[0];
    const est = r.establecerReglaDefault({ porPlaza: {} }, plaza.id, regla);
    expect(r.aplicarReglaDefault(plaza, est).reglaDefault).toEqual(regla);
    expect(r.aplicarReglaDefault(plaza, { porPlaza: {} })).toBe(plaza);
    expect(plaza.reglaDefault).not.toEqual(regla);
  });

  it("el default editado alcanza a los locales que lo heredan, no a los de regla propia", () => {
    const plazaA09 = seed.plazas.find((p) => p.id === localA09.plazaId)!;
    const est = r.establecerReglaDefault({ porPlaza: {} }, plazaA09.id, regla);

    const heredado = r.aplicarReglaHeredada(localA09, plazaA09.reglaDefault, est);
    expect(heredado.regla).toEqual({ ...regla, cuando: localA09.regla.cuando });
    expect(localA09.regla).not.toEqual(heredado.regla);

    const propio = { ...localA09, regla: { ...localA09.regla, puntos: 3 } };
    expect(r.aplicarReglaHeredada(propio, plazaA09.reglaDefault, est)).toBe(propio);
    expect(
      r.aplicarReglaHeredada(localA09, plazaA09.reglaDefault, { porPlaza: {} }),
    ).toBe(localA09);
  });
});
