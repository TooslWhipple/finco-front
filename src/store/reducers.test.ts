import { describe, expect, it } from "vitest";
import { crearSeed } from "@/data/seed";
import {
  contratoDesdeCotizacion,
  costoRealContrato,
  volumenPorEstimar,
  diasSinContacto,
  evaluarCandados,
  proveedoresActivos,
  DEMO_TODAY,
} from "@/domain";
import type { Cotizacion, ExcepcionPrecio, ReglaActualizacion } from "@/domain";
import * as r from "./reducers";

const seed = crearSeed();
const HOY = DEMO_TODAY;
const cotA09 = seed.cotizaciones.find((c) => c.id === "COT-2026-0418") as Cotizacion;
const localA09 = seed.locales.find((l) => l.id === cotA09.localId)!;

const aprobaciones = (): r.AprobacionesState => ({
  excepciones: seed.excepciones,
  cambiosAnuales: seed.cambiosPropuestos,
});

describe("excepciones de precio", () => {
  const pedir = (por = "J") =>
    r.solicitarExcepcion(aprobaciones(), cotA09, localA09, por, "m", HOY);

  it("solicitar crea una pendiente y no duplica la abierta", () => {
    const uno = r.solicitarExcepcion(
      aprobaciones(),
      cotA09,
      localA09,
      "Jorge Ramírez",
      "Cliente ancla",
      HOY,
    );
    expect(uno.excepciones).toHaveLength(seed.excepciones.length + 1);
    const nueva = uno.excepciones.at(-1)!;
    expect(nueva).toMatchObject({
      estado: "PENDIENTE",
      cotizacionId: cotA09.id,
      rentaSolicitada: cotA09.rentaMensual,
      precioMinimo: localA09.precioMinimo,
      motivo: "Cliente ancla",
      solicitadaEn: HOY,
    });
    expect(r.solicitarExcepcion(uno, cotA09, localA09, "Jorge", "otra", HOY)).toBe(uno);
  });

  it("tampoco duplica si la abierta ya fue autorizada y espera a la PMO", () => {
    const pedida = pedir();
    const id = pedida.excepciones.at(-1)!.id;
    const autorizada = r.autorizarExcepcion(pedida, id, "Mariana", HOY);
    expect(r.solicitarExcepcion(autorizada, cotA09, localA09, "J", "otra", HOY)).toBe(
      autorizada,
    );
  });

  it("el candado de precio solo pasa cuando la PMO aplica la excepción autorizada", () => {
    const pedida = pedir();
    const id = pedida.excepciones.at(-1)!.id;
    const estadoPrecio = (e: ExcepcionPrecio | undefined) =>
      evaluarCandados(cotA09, localA09, DEMO_TODAY, e).find(
        (c) => c.id === "PRECIO_MINIMO",
      )?.estado;
    expect(estadoPrecio(pedida.excepciones.at(-1))).toBe("FALLA");

    const autorizada = r.autorizarExcepcion(pedida, id, "Mariana López", HOY, "Procede");
    const aut = autorizada.excepciones.find((e) => e.id === id)!;
    expect(aut).toMatchObject({
      estado: "AUTORIZADA_DIRECCION",
      autorizadaPor: "Mariana López",
      autorizadaEn: HOY,
      comentarioDireccion: "Procede",
    });
    expect(estadoPrecio(aut)).toBe("FALLA");

    const aplicada = r.aplicarExcepcion(autorizada, id, "Ricardo Salas", HOY);
    const apl = aplicada.excepciones.find((e) => e.id === id)!;
    expect(apl).toMatchObject({ estado: "APLICADA", aplicadaPor: "Ricardo Salas" });
    expect(estadoPrecio(apl)).toBe("EXCEPCION");
  });

  it("no se puede aplicar sin autorizar ni autorizar dos veces", () => {
    const pedida = pedir();
    const id = pedida.excepciones.at(-1)!.id;
    expect(r.aplicarExcepcion(pedida, id, "Ricardo", HOY)).toEqual(pedida);
    const autorizada = r.autorizarExcepcion(pedida, id, "Mariana", HOY);
    expect(r.autorizarExcepcion(autorizada, id, "Otra", HOY)).toEqual(autorizada);
  });

  it("rechazar exige comentario; Dirección rechaza pendientes y la PMO, autorizadas", () => {
    const pedida = pedir();
    const id = pedida.excepciones.at(-1)!.id;
    expect(() => r.rechazarExcepcion(pedida, id, "L", HOY, "  ")).toThrow();
    const porDireccion = r.rechazarExcepcion(
      pedida,
      id,
      "Mariana",
      HOY,
      "Fuera de rango",
    );
    expect(porDireccion.excepciones.find((e) => e.id === id)).toMatchObject({
      estado: "RECHAZADA",
      rechazadaPor: "Mariana",
      comentarioDireccion: "Fuera de rango",
    });

    const autorizada = r.autorizarExcepcion(pedida, id, "Mariana", HOY);
    const porPmo = r.rechazarExcepcion(autorizada, id, "Ricardo", HOY, "Rompe el plan");
    expect(porPmo.excepciones.find((e) => e.id === id)).toMatchObject({
      estado: "RECHAZADA",
      rechazadaPor: "Ricardo",
      comentarioPmo: "Rompe el plan",
    });
    // Una rechazada ya no se mueve.
    expect(r.aplicarExcepcion(porPmo, id, "Ricardo", HOY)).toEqual(porPmo);
  });

  it("cuenta lo que espera a Dirección y a la PMO para los avisos", () => {
    const base = aprobaciones();
    const porAutorizar = r.contarPorAutorizar(base);
    const porAplicar = r.contarPorAplicar(base);
    const pedida = r.solicitarExcepcion(base, cotA09, localA09, "J", "m", HOY);
    expect(r.contarPorAutorizar(pedida)).toBe(porAutorizar + 1);
    const id = pedida.excepciones.at(-1)!.id;
    const autorizada = r.autorizarExcepcion(pedida, id, "M", HOY);
    expect(r.contarPorAutorizar(autorizada)).toBe(porAutorizar);
    expect(r.contarPorAplicar(autorizada)).toBe(porAplicar + 1);
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
    const nueva: Cotizacion = { ...cotA09, id: "COT-2026-9999", ofertas: [] };
    const con = r.agregarCotizacion(base, nueva, "2026-11-03", "15:56");
    expect(con.cotizaciones).toHaveLength(base.cotizaciones.length + 1);
    expect(r.agregarCotizacion(con, nueva, "2026-11-03", "15:56")).toBe(con);
    const hecha = r.actualizarCotizacion(
      con,
      nueva.id,
      { estado: "CONTRATO_GENERADO" },
      "usr-sofia",
      "2026-11-03",
      "15:56",
    );
    expect(hecha.cotizaciones.find((c) => c.id === nueva.id)?.estado).toBe(
      "CONTRATO_GENERADO",
    );
    expect(hecha.cotizaciones.find((c) => c.id === cotA09.id)).toEqual(cotA09);
  });

  it("crear registra la oferta 1 y cambiar los términos agrega una oferta nueva", () => {
    const base = { cotizaciones: seed.cotizaciones };
    const nueva: Cotizacion = {
      ...cotA09,
      id: "COT-2026-9998",
      vendedorId: "usr-luis",
      rentaMensual: 20_000,
      ofertas: [],
    };
    const con = r.agregarCotizacion(base, nueva, "2026-11-03", "09:15");
    const creada = con.cotizaciones.find((c) => c.id === nueva.id)!;
    expect(creada.ofertas).toHaveLength(1);
    expect(creada.ofertas[0]).toMatchObject({
      vendedorId: "usr-luis",
      rentaMensual: 20_000,
      hora: "09:15",
    });
    const sinCambio = r.actualizarCotizacion(
      con,
      nueva.id,
      { giro: "Café" },
      "usr-luis",
      "2026-11-03",
      "10:00",
    );
    expect(sinCambio.cotizaciones.find((c) => c.id === nueva.id)?.ofertas).toHaveLength(
      1,
    );
    const renegociada = r.actualizarCotizacion(
      con,
      nueva.id,
      { rentaMensual: 19_000 },
      "usr-jorge",
      "2026-11-03",
      "11:00",
    );
    const ofertas = renegociada.cotizaciones.find((c) => c.id === nueva.id)!.ofertas;
    expect(ofertas).toHaveLength(2);
    expect(ofertas[1]).toMatchObject({ vendedorId: "usr-jorge", rentaMensual: 19_000 });
  });
});

describe("cobranza, integraciones y locales", () => {
  const cobranzaBase = (): r.CobranzaState => ({
    seguimientos: {},
    avisados: [],
    plantillas: seed.plantillasAviso,
    programacion: seed.programacionAvisos,
    envios: [],
  });

  it("registra seguimientos y avisos en la bitácora", () => {
    const uno = r.registrarSeguimiento(cobranzaBase(), "f1", "Recordatorio 3 nov");
    expect(uno.seguimientos).toEqual({ f1: ["Recordatorio 3 nov"] });
    const avisos = r.registrarAvisos(
      uno,
      [
        { facturaId: "f1", plantillaId: "pl-a", canal: "WHATSAPP" },
        { facturaId: "f2", plantillaId: "pl-b", canal: "CORREO" },
      ],
      "Aviso enviado",
      "2026-11-03",
      "15:56",
      "MANUAL",
    );
    expect(avisos.avisados).toEqual(["f1", "f2"]);
    expect(avisos.seguimientos.f2).toEqual(["Aviso enviado"]);
    expect(avisos.seguimientos.f1).toEqual(["Recordatorio 3 nov", "Aviso enviado"]);
    expect(avisos.envios).toEqual([
      expect.objectContaining({ id: "env-1", facturaId: "f1", origen: "MANUAL" }),
      expect.objectContaining({ id: "env-2", facturaId: "f2", canal: "CORREO" }),
    ]);
  });

  it("edita una plantilla sin tocar las demás y respeta que solo el correo lleva asunto", () => {
    const correo = seed.plantillasAviso.find((p) => p.canal === "CORREO")!;
    const wa = seed.plantillasAviso.find((p) => p.canal === "WHATSAPP")!;
    let est = r.editarPlantilla(cobranzaBase(), correo.id, {
      asunto: "Nuevo asunto",
      cuerpo: "Nuevo cuerpo",
    });
    expect(est.plantillas.find((p) => p.id === correo.id)).toMatchObject({
      asunto: "Nuevo asunto",
      cuerpo: "Nuevo cuerpo",
    });
    est = r.editarPlantilla(est, wa.id, { asunto: "No aplica", cuerpo: "Hola" });
    const editada = est.plantillas.find((p) => p.id === wa.id)!;
    expect(editada.cuerpo).toBe("Hola");
    expect(editada.asunto).toBeUndefined();
    expect(est.plantillas).toHaveLength(seed.plantillasAviso.length);
  });

  it("guarda la programación", () => {
    const prog = { activa: false, dias: ["MAR", "VIE"] as const, hora: "08:00" };
    const est = r.guardarProgramacion(cobranzaBase(), { ...prog, dias: [...prog.dias] });
    expect(est.programacion).toEqual({
      activa: false,
      dias: ["MAR", "VIE"],
      hora: "08:00",
    });
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
    expect(
      r.marcarProspectoPerdido(base(), ganado.id, "x", DEMO_TODAY).prospectos,
    ).toEqual(seed.prospectos);
  });

  it("marcar perdido pasa a PERDIDO y deja el motivo en la actividad", () => {
    const est = r.marcarProspectoPerdido(
      base(),
      nuevo.id,
      " sin presupuesto ",
      DEMO_TODAY,
    );
    const p = est.prospectos.find((x) => x.id === nuevo.id)!;
    expect(p.etapa).toBe("PERDIDO");
    expect(p.actividad.at(-1)).toMatchObject({
      titulo: "Descartado: sin presupuesto",
      fecha: DEMO_TODAY,
    });
  });

  it("registrar contacto anota el hecho de hoy y reinicia los días sin contacto", () => {
    const est = r.registrarContactoProspecto(
      base(),
      nuevo.id,
      { tipo: "LLAMADA", nota: "Quedó de visitar el local" },
      DEMO_TODAY,
    );
    const p = est.prospectos.find((x) => x.id === nuevo.id)!;
    expect(p.etapa).toBe(nuevo.etapa);
    expect(p.actividad.at(-1)).toMatchObject({
      titulo: "Llamada: Quedó de visitar el local",
      fecha: DEMO_TODAY,
    });
    expect(diasSinContacto(p, DEMO_TODAY)).toBe(0);
  });

  it("registrar contacto no toca a un prospecto cerrado", () => {
    const ganado = seed.prospectos.find((p) => p.etapa === "GANADO")!;
    const est = r.registrarContactoProspecto(
      base(),
      ganado.id,
      { tipo: "CORREO", nota: "" },
      DEMO_TODAY,
    );
    expect(est.prospectos).toEqual(seed.prospectos);
  });
});

describe("contratos", () => {
  const borrador = contratoDesdeCotizacion(cotA09);

  it("agregar no duplica", () => {
    const est = r.agregarContrato({ nuevos: [], terminaciones: {} }, borrador);
    expect(est.nuevos).toEqual([borrador]);
    expect(r.agregarContrato(est, borrador)).toBe(est);
  });

  it("recorre borrador, en firma y vigente en orden", () => {
    let est = r.agregarContrato({ nuevos: [], terminaciones: {} }, borrador);
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

describe("mantenimientos", () => {
  const estado = (): r.MantenimientosState => ({
    mantenimientos: seed.mantenimientos,
    presupuestos: seed.presupuestosMantenimiento,
    facturasSat: seed.facturasSat,
  });
  const nuevo: r.NuevoMantenimiento = {
    plazaId: "plz-alborada",
    titulo: "Prueba",
    descripcion: "",
    tipo: "PREVENTIVO",
    categoria: "CLIMA",
    origen: "ADMINISTRACION",
    proveedorId: "prv-3",
    fechaProgramada: "2026-12-01",
    costoEstimado: 1000,
    cargoA: "PLAZA",
  };

  it("agregar da el siguiente folio y nace programado y sin evidencia", () => {
    const antes = estado();
    const despues = r.agregarMantenimiento(antes, nuevo, DEMO_TODAY, "Laura Fuentes");
    expect(despues.mantenimientos).toHaveLength(antes.mantenimientos.length + 1);
    const creado = despues.mantenimientos.at(-1)!;
    expect(creado).toMatchObject({
      estatus: "PROGRAMADO",
      evidencia: [],
      titulo: "Prueba",
    });
    expect(creado.folio).toBe(
      `MNT-2026-${String(antes.mantenimientos.length + 1).padStart(4, "0")}`,
    );
    expect(new Set(despues.mantenimientos.map((m) => m.id)).size).toBe(
      despues.mantenimientos.length,
    );
    expect(antes.mantenimientos).toBe(seed.mantenimientos);
  });

  it("transicionar aplica el dominio y deja igual lo inválido", () => {
    const programado = seed.mantenimientos.find((m) => m.estatus === "PROGRAMADO")!;
    const e = estado();
    expect(
      r.transicionarMantenimiento(e, programado.id, "FINALIZADO", { hoy: DEMO_TODAY }),
    ).toBe(e);
    expect(
      r.transicionarMantenimiento(e, "no-existe", "EN_PROCESO", { hoy: DEMO_TODAY }),
    ).toBe(e);
    const iniciado = r.transicionarMantenimiento(e, programado.id, "EN_PROCESO", {
      hoy: DEMO_TODAY,
    });
    expect(iniciado.mantenimientos.find((m) => m.id === programado.id)).toMatchObject({
      estatus: "EN_PROCESO",
      fechaInicio: DEMO_TODAY,
    });
    const terminado = seed.mantenimientos.find((m) => m.estatus === "FINALIZADO")!;
    expect(
      r.transicionarMantenimiento(e, terminado.id, "CANCELADO", { hoy: DEMO_TODAY }),
    ).toBe(e);
  });

  describe("presupuesto y sobregiro", () => {
    const pendiente = () =>
      seed.mantenimientos.find((m) => m.autorizacionSobregiro?.estado === "PENDIENTE")!;
    const alborada = () =>
      seed.presupuestosMantenimiento.find((p) => p.plazaId === "plz-alborada")!;

    it("agregar un trabajo que pasa del presupuesto lo deja pendiente con el excedente", () => {
      const holgura = alborada().monto - 358_300;
      const despues = r.agregarMantenimiento(
        estado(),
        { ...nuevo, costoEstimado: holgura + 500 },
        DEMO_TODAY,
        "Laura Fuentes",
      );
      expect(despues.mantenimientos.at(-1)!.autorizacionSobregiro).toEqual({
        estado: "PENDIENTE",
        solicitadoPor: "Laura Fuentes",
        solicitadoEl: DEMO_TODAY,
        excedente: 500,
      });
    });

    it("un trabajo que cabe nace sin autorización", () => {
      const despues = r.agregarMantenimiento(
        estado(),
        nuevo,
        DEMO_TODAY,
        "Laura Fuentes",
      );
      expect(despues.mantenimientos.at(-1)!.autorizacionSobregiro).toBeUndefined();
    });

    it("el pendiente no se inicia hasta que Dirección lo autoriza", () => {
      const m = pendiente();
      const e = estado();
      expect(
        r.transicionarMantenimiento(e, m.id, "EN_PROCESO", { hoy: DEMO_TODAY }),
      ).toBe(e);
      const autorizado = r.resolverSobregiroMantenimiento(
        e,
        m.id,
        "AUTORIZADA",
        "Mariana López",
        DEMO_TODAY,
      );
      expect(
        autorizado.mantenimientos.find((x) => x.id === m.id)!.autorizacionSobregiro,
      ).toMatchObject({
        estado: "AUTORIZADA",
        resueltoPor: "Mariana López",
        resueltoEl: DEMO_TODAY,
      });
      const iniciado = r.transicionarMantenimiento(autorizado, m.id, "EN_PROCESO", {
        hoy: DEMO_TODAY,
      });
      expect(iniciado.mantenimientos.find((x) => x.id === m.id)!.estatus).toBe(
        "EN_PROCESO",
      );
    });

    it("rechazar exige comentario", () => {
      const m = pendiente();
      const e = estado();
      expect(
        r.resolverSobregiroMantenimiento(
          e,
          m.id,
          "RECHAZADA",
          "Mariana López",
          DEMO_TODAY,
        ),
      ).toBe(e);
      const rechazado = r.resolverSobregiroMantenimiento(
        e,
        m.id,
        "RECHAZADA",
        "Mariana López",
        DEMO_TODAY,
        "Esperar al próximo año",
      );
      expect(
        rechazado.mantenimientos.find((x) => x.id === m.id)!.autorizacionSobregiro,
      ).toMatchObject({ estado: "RECHAZADA", comentario: "Esperar al próximo año" });
    });

    it("fijar el presupuesto actualiza el existente, crea el faltante y rechaza lo inválido", () => {
      const e = estado();
      const nuevoMonto = r.fijarPresupuestoMantenimiento(
        e,
        "plz-alborada",
        2026,
        500_000,
      );
      expect(
        nuevoMonto.presupuestos.find((p) => p.plazaId === "plz-alborada")!.monto,
      ).toBe(500_000);
      expect(nuevoMonto.presupuestos).toHaveLength(e.presupuestos.length);
      const creado = r.fijarPresupuestoMantenimiento(e, "plz-nueva", 2026, 80_000);
      expect(creado.presupuestos).toHaveLength(e.presupuestos.length + 1);
      expect(r.fijarPresupuestoMantenimiento(e, "plz-alborada", 2026, -1)).toBe(e);
      expect(r.fijarPresupuestoMantenimiento(e, "plz-alborada", 2026, Number.NaN)).toBe(
        e,
      );
    });

    it("liga una factura libre de la misma plaza y la regresa a la bandeja", () => {
      const e = estado();
      const libre = e.facturasSat.find(
        (f) => f.plazaId === "plz-alborada" && f.mantenimientoId === undefined,
      )!;
      const m = e.mantenimientos.find((x) => x.plazaId === "plz-alborada")!;
      const ligada = r.ligarFacturaSat(e, libre.id, m.id);
      expect(ligada.facturasSat.find((f) => f.id === libre.id)!.mantenimientoId).toBe(
        m.id,
      );
      // Ya ligada: no se vuelve a ligar a otro.
      expect(r.ligarFacturaSat(ligada, libre.id, "otro")).toBe(ligada);
      const libreOtraPlaza = e.mantenimientos.find((x) => x.plazaId !== "plz-alborada")!;
      expect(r.ligarFacturaSat(e, libre.id, libreOtraPlaza.id)).toBe(e);
      const desligada = r.desligarFacturaSat(ligada, libre.id);
      expect(
        desligada.facturasSat.find((f) => f.id === libre.id)!.mantenimientoId,
      ).toBeUndefined();
      expect(r.desligarFacturaSat(e, libre.id)).toBe(e);
    });
  });
});

describe("cortes de obra", () => {
  const obra: r.ObraState = {
    contratos: seed.obra.contratos,
    cronograma: seed.obra.cronograma,
    cortes: seed.obra.cortes,
    pagos: seed.obra.pagos,
    estimaciones: seed.obra.estimaciones,
    licitaciones: seed.licitaciones,
  };
  const muros = obra.contratos.find(
    (c) => c.terrenoId === "ter-09" && c.partida === "MUROS",
  )!;
  const entrada = (volumen: number) => ({
    contratoObraId: muros.id,
    semana: "2026-10-26",
    volumenes: [{ conceptoId: muros.conceptos[0].id, volumen }],
  });

  it("registrar firma el corte como el actor, con la evidencia recibida", () => {
    const fotos = [{ src: "/a.webp", alt: "a", ancho: 1, alto: 1 }];
    const est = r.registrarCorte(obra, entrada(200), "Héctor Ramos", DEMO_TODAY, fotos);
    const nuevo = est.cortes.at(-1)!;
    expect(est.cortes).toHaveLength(obra.cortes.length + 1);
    expect(nuevo).toMatchObject({
      estado: "FIRMADO_SUPERVISOR",
      capturadoPor: "Héctor Ramos",
      semana: "2026-10-26",
      evidencia: fotos,
    });
    expect(new Set(est.cortes.map((c) => c.id)).size).toBe(est.cortes.length);
  });

  it("una captura que excede lo contratado o repite semana no cambia nada", () => {
    expect(r.registrarCorte(obra, entrada(1e9), "Héctor Ramos", DEMO_TODAY, [])).toBe(
      obra,
    );
    const uno = r.registrarCorte(obra, entrada(200), "Héctor Ramos", DEMO_TODAY, []);
    expect(r.registrarCorte(uno, entrada(10), "Héctor Ramos", DEMO_TODAY, [])).toBe(uno);
  });

  it("la PMO valida un firmado, y un validado ya no cambia", () => {
    const uno = r.registrarCorte(obra, entrada(200), "Héctor Ramos", DEMO_TODAY, []);
    const id = uno.cortes.at(-1)!.id;
    const validado = r.resolverCorteObra(
      uno,
      id,
      "VALIDADO_PMO",
      "Ricardo Salas",
      DEMO_TODAY,
    );
    expect(validado.cortes.at(-1)).toMatchObject({
      estado: "VALIDADO_PMO",
      validadoPor: "Ricardo Salas",
    });
    const intento = r.resolverCorteObra(
      validado,
      id,
      "RECHAZADO",
      "Ricardo Salas",
      DEMO_TODAY,
      "x",
    );
    expect(intento.cortes.at(-1)!.estado).toBe("VALIDADO_PMO");
  });

  it("rechazar sin comentario no hace nada; con comentario lo deja rechazado y libera la semana", () => {
    const uno = r.registrarCorte(obra, entrada(200), "Héctor Ramos", DEMO_TODAY, []);
    const id = uno.cortes.at(-1)!.id;
    const sin = r.resolverCorteObra(uno, id, "RECHAZADO", "Ricardo Salas", DEMO_TODAY);
    expect(sin.cortes.at(-1)!.estado).toBe("FIRMADO_SUPERVISOR");
    const con = r.resolverCorteObra(
      uno,
      id,
      "RECHAZADO",
      "Ricardo Salas",
      DEMO_TODAY,
      "No coincide",
    );
    expect(con.cortes.at(-1)).toMatchObject({
      estado: "RECHAZADO",
      comentario: "No coincide",
    });
    expect(
      r.registrarCorte(con, entrada(150), "Héctor Ramos", DEMO_TODAY, []).cortes,
    ).toHaveLength(con.cortes.length + 1);
  });
});

describe("licitaciones de obra", () => {
  const obra: r.ObraState = {
    contratos: seed.obra.contratos,
    cronograma: seed.obra.cronograma,
    cortes: seed.obra.cortes,
    pagos: seed.obra.pagos,
    estimaciones: seed.obra.estimaciones,
    licitaciones: seed.licitaciones,
  };
  const enCurso = obra.licitaciones.find((l) => l.estado === "EN_CURSO")!;
  const activos = proveedoresActivos(enCurso);

  it("registrarRonda agrega la ronda y respeta licitaciones ajenas", () => {
    const entrada = Object.fromEntries(activos.map((id, i) => [id, 6_000_000 + i]));
    const e = r.registrarRonda(obra, enCurso.id, entrada, DEMO_TODAY);
    const actual = e.licitaciones.find((l) => l.id === enCurso.id)!;
    expect(actual.rondas).toHaveLength(enCurso.rondas.length + 1);
    expect(e.licitaciones.filter((l) => l.id !== enCurso.id)).toEqual(
      obra.licitaciones.filter((l) => l.id !== enCurso.id),
    );
  });

  it("descartar sin motivo deja el estado igual; con motivo suma el descarte", () => {
    expect(r.descartarProveedor(obra, enCurso.id, activos[0], "  ")).toEqual(obra);
    const e = r.descartarProveedor(obra, enCurso.id, activos[0], "Sin experiencia");
    expect(e.licitaciones.find((l) => l.id === enCurso.id)!.descartados).toHaveLength(
      enCurso.descartados.length + 1,
    );
  });

  it("adjudicar exige motivo y fija ganador, monto y autor", () => {
    expect(
      r.adjudicarLicitacion(obra, enCurso.id, activos[0], "", "Ana", DEMO_TODAY),
    ).toEqual(obra);
    const e = r.adjudicarLicitacion(
      obra,
      enCurso.id,
      activos[0],
      "Mejor precio",
      "Ana",
      DEMO_TODAY,
    );
    const actual = e.licitaciones.find((l) => l.id === enCurso.id)!;
    expect(actual.estado).toBe("ADJUDICADA");
    expect(actual.adjudicadaPor).toBe("Ana");
  });
});

describe("liberación de locales", () => {
  const contrato = { ...contratoDesdeCotizacion(cotA09), estado: "VIGENTE" as const };

  it("aplicarTerminaciones marca el contrato como terminado con la fecha de salida", () => {
    const res = r.aplicarTerminaciones([contrato, { ...contrato, id: "otro" }], {
      [contrato.id]: { fecha: "2026-11-10", motivo: "x" },
    });
    expect(res[0]).toMatchObject({ estado: "TERMINADO", fin: "2026-11-10" });
    expect(res[1].estado).toBe("VIGENTE");
  });

  it("aplicarAjuste usa estatus, libreDesde y quita el locatario", () => {
    const local = crearSeed().locales.find((l) => l.estatus === "OCUPADO")!;
    const res = r.aplicarAjuste(local, {
      estatus: "DISPONIBLE",
      libreDesde: "2026-11-10",
      sinLocatario: true,
    });
    expect(res).toMatchObject({ estatus: "DISPONIBLE", libreDesde: "2026-11-10" });
    expect(res.locatarioId).toBeUndefined();
  });
});

describe("estimaciones de pago", () => {
  const obra: r.ObraState = {
    contratos: seed.obra.contratos,
    cronograma: seed.obra.cronograma,
    cortes: seed.obra.cortes,
    pagos: seed.obra.pagos,
    estimaciones: seed.obra.estimaciones,
    licitaciones: seed.licitaciones,
  };
  const muros = obra.contratos.find(
    (c) => c.terrenoId === "ter-09" && c.partida === "MUROS",
  )!;
  const concepto = muros.conceptos[0].id;
  const disponible = volumenPorEstimar(muros, obra.cortes, obra.estimaciones)[concepto];
  const entrada = (volumen: number) => ({
    contratoObraId: muros.id,
    volumenes: [{ conceptoId: concepto, volumen }],
  });

  it("registrar firma como el actor con anticipo y fondo; lo que excede lo validado no cambia nada", () => {
    expect(
      r.registrarEstimacion(obra, entrada(disponible + 1), "Héctor Ramos", HOY, []),
    ).toBe(obra);
    const est = r.registrarEstimacion(obra, entrada(disponible), "Héctor Ramos", HOY, []);
    const nueva = est.estimaciones.at(-1)!;
    expect(est.estimaciones).toHaveLength(obra.estimaciones.length + 1);
    expect(nueva).toMatchObject({
      estado: "VALIDADA_SUPERVISOR",
      registradaPor: "Héctor Ramos",
      numero: 1,
    });
    expect(nueva.amortizacionAnticipo).toBeCloseTo(nueva.importeBruto * 0.3, 2);
    expect(nueva.fondoGarantia).toBeCloseTo(nueva.importeBruto * 0.05, 2);
    expect(new Set(est.estimaciones.map((e) => e.id)).size).toBe(est.estimaciones.length);
  });

  it("autorizar crea el pago por el bruto y sube el costo real; no se autoriza dos veces", () => {
    const uno = r.registrarEstimacion(obra, entrada(disponible), "Héctor Ramos", HOY, []);
    const id = uno.estimaciones.at(-1)!.id;
    const antes = costoRealContrato(muros, uno.pagos, HOY);
    const autorizada = r.resolverEstimacionObra(
      uno,
      id,
      "AUTORIZADA_PMO",
      "Ricardo Salas",
      HOY,
    );
    const est = autorizada.estimaciones.at(-1)!;
    expect(est).toMatchObject({
      estado: "AUTORIZADA_PMO",
      autorizadaPor: "Ricardo Salas",
    });
    expect(autorizada.pagos).toHaveLength(uno.pagos.length + 1);
    expect(autorizada.pagos.at(-1)).toMatchObject({
      id: est.pagoId,
      monto: est.importeBruto,
    });
    expect(costoRealContrato(muros, autorizada.pagos, HOY) - antes).toBeCloseTo(
      est.importeBruto,
      2,
    );
    expect(
      r.resolverEstimacionObra(autorizada, id, "AUTORIZADA_PMO", "Ricardo Salas", HOY),
    ).toBe(autorizada);
  });

  it("rechazar sin motivo no hace nada; con motivo libera el volumen y no paga", () => {
    const uno = r.registrarEstimacion(obra, entrada(disponible), "Héctor Ramos", HOY, []);
    const id = uno.estimaciones.at(-1)!.id;
    expect(r.resolverEstimacionObra(uno, id, "RECHAZADA", "Ricardo Salas", HOY)).toBe(
      uno,
    );
    const rechazada = r.resolverEstimacionObra(
      uno,
      id,
      "RECHAZADA",
      "Ricardo Salas",
      HOY,
      "Sin soporte",
    );
    expect(rechazada.estimaciones.at(-1)).toMatchObject({
      estado: "RECHAZADA",
      comentario: "Sin soporte",
    });
    expect(rechazada.pagos).toHaveLength(uno.pagos.length);
    expect(
      r.registrarEstimacion(rechazada, entrada(disponible), "Héctor Ramos", HOY, [])
        .estimaciones,
    ).toHaveLength(rechazada.estimaciones.length + 1);
  });
});
