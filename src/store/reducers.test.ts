import { describe, expect, it } from "vitest";
import { crearSeed } from "@/data/seed";
import {
  contratoDesdeCotizacion,
  costoRealContrato,
  volumenPorEstimar,
  diasSinContacto,
  alertasObra,
  evaluarCandados,
  indicadoresObra,
  montoContrato,
  proveedoresActivos,
  sumarDias,
  DEMO_TODAY,
  ESQUEMA_INICIAL,
  PROGRAMACION_EMISION_INICIAL,
  REGLA_RECARGO_INICIAL,
} from "@/domain";
import type { Cotizacion, ExcepcionPrecio, ReglaActualizacion } from "@/domain";
import type { PrecioConcepto } from "@/domain";
import {
  crearContrato,
  crearCotizacion,
  crearFactura,
  crearLicitacion,
  crearProspecto,
  crearProveedor,
} from "@/domain/fixtures";
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
    emitidas: [],
    recargos: [],
    pagos: {},
    programacionEmision: PROGRAMACION_EMISION_INICIAL,
    reglaRecargo: REGLA_RECARGO_INICIAL,
  });

  const emitida = (localId: string) =>
    crearFactura({ id: `fac-em-${localId}-2026-12`, localId, origen: "EMISION" });
  const recargo = (k: number) =>
    crearFactura({
      id: `rec-fac-1-${k}`,
      concepto: "RECARGO",
      origen: "EMISION",
      facturaOrigenId: "fac-1",
      monto: 200,
    });

  it("emitir guarda facturas y recargos sin duplicar y anexa un envío sin tocar avisados", () => {
    const emision = {
      facturas: [emitida("A"), emitida("B")],
      recargos: [recargo(1)],
      entregas: [
        {
          facturaId: "fac-em-A-2026-12",
          plantillaId: "pl-x",
          canal: "WHATSAPP" as const,
        },
        {
          facturaId: "fac-em-B-2026-12",
          plantillaId: "pl-x",
          canal: "WHATSAPP" as const,
        },
      ],
    };
    const base = { ...cobranzaBase(), avisados: ["f9"] };
    const uno = r.emitirFacturacion(base, emision, "2026-11-03", "07:00", "MANUAL");
    expect(uno.emitidas.map((f) => f.id)).toEqual([
      "fac-em-A-2026-12",
      "fac-em-B-2026-12",
    ]);
    expect(uno.recargos).toHaveLength(1);
    expect(uno.envios).toEqual([
      expect.objectContaining({
        id: "env-1",
        facturaId: "fac-em-A-2026-12",
        hora: "07:00",
      }),
      expect.objectContaining({ id: "env-2", facturaId: "fac-em-B-2026-12" }),
    ]);
    expect(uno.avisados).toEqual(["f9"]);
    expect(uno.seguimientos).toEqual({});
    const dos = r.emitirFacturacion(uno, emision, "2026-11-03", "08:00", "MANUAL");
    expect(dos.emitidas).toHaveLength(2);
    expect(dos.recargos).toHaveLength(1);
    expect(dos.envios).toHaveLength(2);
  });

  it("los recargos no se repiten", () => {
    const uno = r.generarRecargos(cobranzaBase(), [recargo(1), recargo(1)]);
    expect(uno.recargos).toHaveLength(1);
    const dos = r.generarRecargos(uno, [recargo(1), recargo(2)]);
    expect(dos.recargos.map((f) => f.id)).toEqual(["rec-fac-1-1", "rec-fac-1-2"]);
  });

  it("el pago guarda su complemento y no admite un segundo pago", () => {
    const complemento = { id: "cp-fac-1", fecha: HOY, monto: 10_400, folio: "CP-A-3001" };
    const uno = r.registrarPago(cobranzaBase(), "fac-1", complemento);
    expect(uno.pagos).toEqual({ "fac-1": [complemento] });
    const dos = r.registrarPago(uno, "fac-1", { ...complemento, monto: 1 });
    expect(dos).toBe(uno);
  });

  it("guarda la programación de emisión y la regla de recargo", () => {
    const prog = { activa: false, dia: 28, hora: "09:00", canal: "CORREO" as const };
    expect(
      r.guardarProgramacionEmision(cobranzaBase(), prog).programacionEmision,
    ).toEqual(prog);
    const regla = { porcentaje: 0.03, diasGracia: 10 };
    expect(r.editarReglaRecargo(cobranzaBase(), regla).reglaRecargo).toEqual(regla);
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

describe("ganado automático", () => {
  const vivo = crearProspecto({ id: "pro-200", etapa: "NEGOCIACION" });
  const perdido = crearProspecto({ id: "pro-201", etapa: "PERDIDO" });
  const ganado = crearProspecto({ id: "pro-202", etapa: "GANADO" });
  const base = (): r.ProspectosState => ({ prospectos: [vivo, perdido, ganado] });

  it("pasa a GANADO a un prospecto vivo con la actividad del folio", () => {
    const est = r.ganarProspectoPorContrato(base(), vivo.id, "CTR-2026-0001", HOY);
    const p = est.prospectos.find((x) => x.id === vivo.id)!;
    expect(p.etapa).toBe("GANADO");
    expect(p.actividad.at(-1)).toMatchObject({
      titulo: "Contrato CTR-2026-0001 generado",
      fecha: HOY,
    });
  });

  it("deja intactos a los ganados y perdidos", () => {
    for (const cerrado of [perdido, ganado]) {
      const est = r.ganarProspectoPorContrato(base(), cerrado.id, "CTR-X", HOY);
      expect(est.prospectos).toEqual(base().prospectos);
    }
  });
});

describe("expediente del prospecto", () => {
  const moral = crearProspecto({
    id: "pro-100",
    etapa: "NEGOCIACION",
    tipoPersona: "MORAL",
    documentos: {
      IDENTIFICACION: "2026-10-01",
      CONSTANCIA_FISCAL: "2026-10-01",
      COMPROBANTE_DOMICILIO: "2026-10-01",
      PODER_REPRESENTANTE: "2026-10-01",
    },
  });
  const ganado = crearProspecto({ id: "pro-101", etapa: "GANADO", documentos: {} });
  const base = (): r.ProspectosState => ({ prospectos: [moral, ganado] });
  const de = (est: r.ProspectosState, id: string) =>
    est.prospectos.find((p) => p.id === id)!;

  it("registrar con true fija la fecha de hoy y no anota actividad", () => {
    const est = r.registrarDocumentoProspecto(
      base(),
      moral.id,
      "ACTA_CONSTITUTIVA",
      true,
      DEMO_TODAY,
    );
    expect(de(est, moral.id).documentos.ACTA_CONSTITUTIVA).toBe(DEMO_TODAY);
    expect(de(est, moral.id).actividad).toEqual(moral.actividad);
  });

  it("registrar con false borra la clave", () => {
    const est = r.registrarDocumentoProspecto(
      base(),
      moral.id,
      "IDENTIFICACION",
      false,
      DEMO_TODAY,
    );
    expect(Object.hasOwn(de(est, moral.id).documentos, "IDENTIFICACION")).toBe(false);
  });

  it("un prospecto cerrado queda igual", () => {
    const est = r.registrarDocumentoProspecto(
      base(),
      ganado.id,
      "IDENTIFICACION",
      true,
      DEMO_TODAY,
    );
    expect(de(est, ganado.id)).toEqual(ganado);
  });

  it("recalcula las cotizaciones ligadas abiertas y no las que ya generaron contrato", () => {
    const instantanea = { nombre: moral.nombre, documentosCompletos: false };
    const cotizaciones: r.CotizacionesState = {
      cotizaciones: [
        crearCotizacion({
          id: "COT-B",
          prospectoId: moral.id,
          estado: "BORRADOR",
          prospecto: instantanea,
        }),
        crearCotizacion({
          id: "COT-E",
          prospectoId: moral.id,
          estado: "ENVIADA",
          prospecto: instantanea,
        }),
        crearCotizacion({
          id: "COT-G",
          prospectoId: moral.id,
          estado: "CONTRATO_GENERADO",
          prospecto: instantanea,
        }),
        crearCotizacion({
          id: "COT-OTRO",
          prospectoId: "pro-otro",
          estado: "BORRADOR",
          prospecto: instantanea,
        }),
      ],
    };
    const completo = de(
      r.registrarDocumentoProspecto(
        base(),
        moral.id,
        "ACTA_CONSTITUTIVA",
        true,
        DEMO_TODAY,
      ),
      moral.id,
    );
    const est = r.recalcularExpedienteCotizaciones(cotizaciones, completo);
    const completa = Object.fromEntries(
      est.cotizaciones.map((c) => [c.id, c.prospecto.documentosCompletos]),
    );
    expect(completa).toEqual({
      "COT-B": true,
      "COT-E": true,
      "COT-G": false,
      "COT-OTRO": false,
    });
  });
});

describe("contratos", () => {
  const borrador = contratoDesdeCotizacion(cotA09);

  it("agregar no duplica", () => {
    const est = r.agregarContrato(
      { nuevos: [], terminaciones: {}, aperturas: {} },
      borrador,
    );
    expect(est.nuevos).toEqual([borrador]);
    expect(r.agregarContrato(est, borrador)).toBe(est);
  });

  it("recorre borrador, en firma y vigente en orden", () => {
    let est = r.agregarContrato(
      { nuevos: [], terminaciones: {}, aperturas: {} },
      borrador,
    );
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

describe("aperturas", () => {
  const vacio = (): r.ContratosState => ({
    nuevos: [],
    terminaciones: {},
    aperturas: {},
  });
  const apertura = {
    fecha: "2026-10-01",
    registradaPor: "usr-pmo",
    registradaEl: DEMO_TODAY,
  };

  it("registrarApertura no duplica ni sobrescribe", () => {
    const est = r.registrarApertura(vacio(), "ctr-1", apertura);
    expect(est.aperturas).toEqual({ "ctr-1": apertura });
    const otra = { ...apertura, fecha: "2026-10-15" };
    expect(r.registrarApertura(est, "ctr-1", otra)).toBe(est);
  });

  it("aplicarAperturas agrega la de la demo y respeta la de la semilla", () => {
    const deSemilla = {
      fecha: "2024-02-01",
      registradaPor: "usr-pmo",
      registradaEl: "2024-02-01",
    };
    const contratos = [
      crearContrato({ id: "a" }),
      crearContrato({ id: "b", apertura: deSemilla }),
      crearContrato({ id: "c" }),
    ];
    const res = r.aplicarAperturas(contratos, { a: apertura, b: apertura });
    expect(res[0].apertura).toEqual(apertura);
    expect(res[1].apertura).toEqual(deSemilla);
    expect(res[2].apertura).toBeUndefined();
    expect(res[2]).toBe(contratos[2]);
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

describe("padrón de proveedores", () => {
  const base = (): r.ProveedoresState => ({ padron: seed.proveedores });

  it("agregarProveedor persiste el alta y rechaza un id existente o un RFC repetido", () => {
    const alta = crearProveedor({ id: "prv-9", rfc: "IMP200101AB1" });
    const est = r.agregarProveedor(base(), alta);
    expect(est.padron).toHaveLength(seed.proveedores.length + 1);
    expect(est.padron.at(-1)).toEqual(alta);
    expect(r.agregarProveedor(est, { ...alta, rfc: "OTR200101AB1" })).toBe(est);
    const mismoRfc = {
      ...alta,
      id: "prv-10",
      rfc: seed.proveedores[0].rfc.toLowerCase(),
    };
    expect(r.agregarProveedor(est, mismoRfc)).toBe(est);
  });

  it("editarProveedor persiste el cambio y rechaza un id inexistente o el RFC de otro", () => {
    const [primero, segundo] = seed.proveedores;
    const est = r.editarProveedor(base(), { ...primero, nombre: "Nuevo", activo: false });
    expect(est.padron[0]).toMatchObject({
      id: primero.id,
      nombre: "Nuevo",
      activo: false,
    });
    expect(est.padron).toHaveLength(seed.proveedores.length);
    expect(r.editarProveedor(base(), { ...primero, rfc: primero.rfc }).padron[0]).toEqual(
      primero,
    );
    expect(r.editarProveedor(est, { ...primero, id: "prv-999" })).toBe(est);
    expect(r.editarProveedor(est, { ...primero, rfc: segundo.rfc })).toBe(est);
  });
});

describe("campañas comerciales", () => {
  const base = (): r.CampanasState => ({ campanas: seed.campanas });
  const alta = {
    id: "cmp-07",
    nombre: "Facebook Ads · Prueba",
    canal: "REDES" as const,
    inicio: "2026-11-01",
    inversion: 15_000,
  };

  it("agregarCampana persiste el alta y rechaza un id repetido", () => {
    const est = r.agregarCampana(base(), alta);
    expect(est.campanas).toHaveLength(seed.campanas.length + 1);
    expect(est.campanas.at(-1)).toEqual(alta);
    expect(r.agregarCampana(est, { ...alta, nombre: "Otra" })).toBe(est);
  });

  it("editarCampana cambia la inversión e ignora un id inexistente", () => {
    const [primera] = seed.campanas;
    const est = r.editarCampana(base(), { ...primera, inversion: 1 });
    expect(est.campanas[0]).toEqual({ ...primera, inversion: 1 });
    expect(est.campanas).toHaveLength(seed.campanas.length);
    expect(r.editarCampana(est, { ...primera, id: "cmp-99" })).toBe(est);
  });
});

describe("casos de servicio", () => {
  const AHORA = "2026-11-03T15:56:00";
  const andrea = { id: "usr-atencion", nombre: "Andrea Robles" };
  const nuevo: r.NuevoCaso = {
    plazaId: "plz-alborada",
    localId: "plz-alborada-A-01",
    locatarioId: "loc-0001",
    tipo: "FUGA",
    prioridad: "ALTA",
    canal: "TELEFONO",
    descripcion: "Fuga en el baño",
    facturaId: "fac-0001",
  };

  it("registrar da el siguiente id y folio del año, nace recibido y sin factura si no es aclaración", () => {
    const antes: r.CasosState = { casos: seed.casos };
    const despues = r.registrarCaso(antes, nuevo, AHORA, "Andrea Robles");
    const creado = despues.casos.at(-1)!;
    expect(creado).toMatchObject({ estatus: "RECIBIDO", abiertoEl: AHORA });
    expect(creado.facturaId).toBeUndefined();
    expect(creado.bitacora).toHaveLength(1);
    expect(new Set(despues.casos.map((c) => c.id)).size).toBe(despues.casos.length);
    expect(new Set(despues.casos.map((c) => c.folio)).size).toBe(despues.casos.length);
    const aclaracion = r.registrarCaso(
      antes,
      { ...nuevo, tipo: "ACLARACION_FACTURA" },
      AHORA,
      "Andrea Robles",
    );
    expect(aclaracion.casos.at(-1)?.facturaId).toBe("fac-0001");
  });

  it("comentar no cuenta como respuesta; un caso cerrado ya no se responde", () => {
    const registrado = r.registrarCaso({ casos: [] }, nuevo, AHORA, "Andrea Robles");
    const id = registrado.casos[0].id;
    const comentado = r.comentarCaso(
      registrado,
      id,
      "Nota interna",
      AHORA,
      "Andrea Robles",
    );
    expect(comentado.casos[0]).toMatchObject({ estatus: "RECIBIDO", bitacora: [{}, {}] });
    expect(comentado.casos[0].primeraRespuestaEl).toBeUndefined();
    const cerrado: r.CasosState = {
      casos: [{ ...registrado.casos[0], estatus: "CERRADO", calificacion: 5 }],
    };
    expect(r.responderCaso(cerrado, id, "Hola", AHORA, andrea)).toBe(cerrado);
  });

  it("transicionar valida el ciclo y la calificación", () => {
    const e = r.responderCaso(
      r.registrarCaso({ casos: [] }, nuevo, "2026-11-03T08:00:00", "Andrea Robles"),
      "cas-0001",
      "Vamos para allá",
      "2026-11-03T09:00:00",
      andrea,
    );
    expect(r.transicionarCaso(e, "cas-0001", "CERRADO", AHORA, "Andrea Robles", 5)).toBe(
      e,
    );
    const resuelto = r.transicionarCaso(
      e,
      "cas-0001",
      "RESUELTO",
      AHORA,
      "Andrea Robles",
    );
    expect(
      r.transicionarCaso(resuelto, "cas-0001", "CERRADO", AHORA, "Andrea Robles"),
    ).toBe(resuelto);
    const cerrado = r.transicionarCaso(
      resuelto,
      "cas-0001",
      "CERRADO",
      AHORA,
      "Andrea Robles",
      4,
    );
    expect(cerrado.casos[0]).toMatchObject({ estatus: "CERRADO", calificacion: 4 });
  });
});

describe("comisiones", () => {
  const vacio: r.ComisionesState = { esquema: ESQUEMA_INICIAL, comisiones: [] };
  const cotizacion = crearCotizacion({ plazoMeses: 24, mesesGracia: 2 });
  const contrato = crearContrato({ id: "ctr-COT-2026-0418", rentaMensual: 20_000 });
  const excepcion = (estado: ExcepcionPrecio["estado"]): ExcepcionPrecio => ({
    id: "exc-1",
    cotizacionId: cotizacion.id,
    localId: cotizacion.localId,
    rentaSolicitada: 18_000,
    precioMinimo: 20_000,
    estado,
    solicitadaPor: "usr-sofia",
  });
  const firmado = r.registrarComisionesDeFirma(
    vacio,
    contrato,
    cotizacion,
    [],
    true,
    "2026-11-03T16:00:00",
  );

  it("la firma genera asesor, bono y mando medio con plazo y gracia de la cotización", () => {
    expect(firmado.comisiones.map((c) => [c.concepto, c.usuarioId, c.monto])).toEqual([
      ["ASESOR", "usr-sofia", 8_000],
      ["BONO_SIN_EXCEPCION", "usr-sofia", 2_000],
      ["MANDO_MEDIO", "usr-jorge", 2_000],
    ]);
    expect(firmado.comisiones[0]).toMatchObject({ base: 200_000, generadaEl: "2026-11-03" });
  });

  it("la excepción APLICADA de la cotización quita el bono; un vendedor fuera del equipo no comisiona", () => {
    const conExcepcion = r.registrarComisionesDeFirma(
      vacio,
      contrato,
      cotizacion,
      [excepcion("APLICADA")],
      true,
      "2026-11-03T16:00:00",
    );
    expect(conExcepcion.comisiones.map((c) => c.concepto)).toEqual(["ASESOR", "MANDO_MEDIO"]);
    expect(
      r.registrarComisionesDeFirma(vacio, contrato, cotizacion, [], false, "2026-11-03T16:00:00"),
    ).toBe(vacio);
  });

  it("los ids que ya existen se ignoran", () => {
    expect(
      r.registrarComisionesDeFirma(firmado, contrato, cotizacion, [], true, "2026-11-04T10:00:00"),
    ).toBe(firmado);
  });

  it("marcarComisionPagada con un id inexistente o ya pagada no cambia nada", () => {
    const id = firmado.comisiones[0].id;
    expect(r.marcarComisionPagada(firmado, "com-no-existe", DEMO_TODAY)).toBe(firmado);
    const pagado = r.marcarComisionPagada(firmado, id, "2026-11-10");
    expect(pagado.comisiones[0].pagadaEl).toBe("2026-11-10");
    expect(pagado.comisiones.slice(1)).toEqual(firmado.comisiones.slice(1));
    expect(r.marcarComisionPagada(pagado, id, DEMO_TODAY)).toBe(pagado);
  });

  it("editar el esquema no toca las comisiones generadas", () => {
    const editado = r.editarEsquemaComisiones(firmado, { ...ESQUEMA_INICIAL, asesorPct: 5 });
    expect(editado.esquema.asesorPct).toBe(5);
    expect(editado.comisiones).toBe(firmado.comisiones);
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

  // Sin catálogo la ronda se captura por total y adjudicar no crea contrato.
  const sinCatalogo = crearLicitacion();
  const obraSinCatalogo: r.ObraState = {
    ...obra,
    licitaciones: [...obra.licitaciones, sinCatalogo],
  };

  it("registrarRonda agrega la ronda y respeta licitaciones ajenas", () => {
    const entrada = Object.fromEntries(
      proveedoresActivos(sinCatalogo).map((id, i) => [id, 900_000 + i]),
    );
    const e = r.registrarRonda(obraSinCatalogo, sinCatalogo.id, entrada, DEMO_TODAY);
    const actual = e.licitaciones.find((l) => l.id === sinCatalogo.id)!;
    expect(actual.rondas).toHaveLength(sinCatalogo.rondas.length + 1);
    expect(e.licitaciones.filter((l) => l.id !== sinCatalogo.id)).toEqual(
      obraSinCatalogo.licitaciones.filter((l) => l.id !== sinCatalogo.id),
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
    const ganador = proveedoresActivos(sinCatalogo)[0];
    expect(
      r.adjudicarLicitacion(
        obraSinCatalogo,
        sinCatalogo.id,
        ganador,
        "",
        "Ana",
        DEMO_TODAY,
      ),
    ).toEqual(obraSinCatalogo);
    const e = r.adjudicarLicitacion(
      obraSinCatalogo,
      sinCatalogo.id,
      ganador,
      "Mejor precio",
      "Ana",
      DEMO_TODAY,
    );
    const actual = e.licitaciones.find((l) => l.id === sinCatalogo.id)!;
    expect(actual.estado).toBe("ADJUDICADA");
    expect(actual.adjudicadaPor).toBe("Ana");
    expect(actual.contratoObraId).toBeUndefined();
    expect(e.contratos).toBe(obraSinCatalogo.contratos);
  });

  describe("en línea, con catálogo (ACABADOS)", () => {
    const ganadorId = "prv-obra-07";
    const ganador = seed.proveedores.find((p) => p.id === ganadorId)!;
    const fechas = {
      inicioPlan: sumarDias(DEMO_TODAY, 14),
      finPlan: sumarDias(DEMO_TODAY, 134),
    };
    const preciosDe = (factor: number): PrecioConcepto[] =>
      enCurso.conceptos.map((c, i) => ({
        conceptoId: c.id,
        precioUnitario: (100 + i * 10) * factor,
      }));

    /** Invita por WhatsApp, responde 07 (contratista) y 16 (PMO) y cierra la ronda 3. */
    function conRondaTresCerrada(): r.ObraState {
      const invitada = r.enviarInvitaciones(
        obra,
        enCurso.id,
        activos,
        "WHATSAPP",
        DEMO_TODAY,
        "09:00",
      );
      const con07 = r.responderLicitacion(
        invitada,
        enCurso.id,
        ganadorId,
        preciosDe(10),
        "CONTRATISTA",
        DEMO_TODAY,
      );
      const con16 = r.responderLicitacion(
        con07,
        enCurso.id,
        "prv-obra-16",
        preciosDe(11),
        "PMO",
        DEMO_TODAY,
      );
      return r.cerrarRonda(con16, enCurso.id);
    }

    it("enviar invitaciones abre la ronda 3 y deja la bitácora simulada", () => {
      const e = r.enviarInvitaciones(
        obra,
        enCurso.id,
        activos,
        "WHATSAPP",
        DEMO_TODAY,
        "09:00",
      );
      const actual = e.licitaciones.find((l) => l.id === enCurso.id)!;
      expect(actual.rondas.at(-1)).toMatchObject({ numero: 3, estado: "ABIERTA" });
      expect(actual.invitaciones.map((i) => i.proveedorId)).toEqual(activos);
      expect(r.cerrarRonda(e, enCurso.id)).toEqual(e);
    });

    it("definirCatalogo reemplaza el catálogo solo mientras no haya precios", () => {
      const uno = [enCurso.conceptos[0]];
      const e = r.definirCatalogo(obra, enCurso.id, uno);
      expect(e.licitaciones.find((l) => l.id === enCurso.id)!.conceptos).toEqual(uno);
      const conPrecios = conRondaTresCerrada();
      expect(r.definirCatalogo(conPrecios, enCurso.id, uno)).toEqual(conPrecios);
    });

    it("adjudicar una licitación con catálogo crea CO-VR-07 con los PU del ganador y proveedorId", () => {
      const cerrada = conRondaTresCerrada();
      const e = r.adjudicarLicitacion(
        cerrada,
        enCurso.id,
        ganadorId,
        "Mejor precio por concepto",
        "Ricardo Salas",
        DEMO_TODAY,
        ganador,
        fechas,
      );
      const nuevo = e.contratos.find((c) => c.folio === "CO-VR-07")!;
      expect(nuevo).toMatchObject({
        id: "ter-09-co-07",
        terrenoId: "ter-09",
        partida: "ACABADOS",
        contratista: ganador.nombre,
        proveedorId: ganadorId,
        anticipoPct: 0.3,
        fondoGarantiaPct: 0.05,
        ...fechas,
      });
      expect(nuevo.conceptos.map((c) => c.precioUnitario)).toEqual(
        preciosDe(10).map((p) => p.precioUnitario),
      );
      const actual = e.licitaciones.find((l) => l.id === enCurso.id)!;
      expect(actual).toMatchObject({
        estado: "ADJUDICADA",
        ganadorId,
        contratoObraId: "ter-09-co-07",
        montoAdjudicado: montoContrato(nuevo),
      });
    });

    it("con fechas inválidas, sin fechas o con la ronda abierta no cambia el estado", () => {
      const cerrada = conRondaTresCerrada();
      const adjudicar = (estado: r.ObraState, f?: typeof fechas) =>
        r.adjudicarLicitacion(
          estado,
          enCurso.id,
          ganadorId,
          "x",
          "Ana",
          DEMO_TODAY,
          ganador,
          f,
        );
      expect(adjudicar(cerrada, { ...fechas, inicioPlan: DEMO_TODAY })).toBe(cerrada);
      expect(adjudicar(cerrada, { ...fechas, finPlan: sumarDias(DEMO_TODAY, 1) })).toBe(
        cerrada,
      );
      expect(adjudicar(cerrada)).toBe(cerrada);
      const abierta = r.enviarInvitaciones(
        cerrada,
        enCurso.id,
        [ganadorId],
        "CORREO",
        DEMO_TODAY,
        "10:00",
      );
      expect(adjudicar(abierta, fechas)).toBe(abierta);
    });

    it("adjudicar ACABADOS crea ter-09-co-07/CO-VR-07, no agrega SIN_REPORTE y conserva SPI y CPI del héroe", () => {
      const cerrada = conRondaTresCerrada();
      const e = r.adjudicarLicitacion(
        cerrada,
        enCurso.id,
        ganadorId,
        "Mejor precio",
        "Ana",
        DEMO_TODAY,
        ganador,
        fechas,
      );
      const delHeroe = (estado: r.ObraState) =>
        estado.contratos.filter((c) => c.terrenoId === "ter-09");
      expect(delHeroe(e).map((c) => c.id)).toContain("ter-09-co-07");
      expect(delHeroe(e)).toHaveLength(delHeroe(obra).length + 1);
      const antes = indicadoresObra(delHeroe(obra), obra.cortes, obra.pagos, DEMO_TODAY)!;
      const despues = indicadoresObra(delHeroe(e), e.cortes, e.pagos, DEMO_TODAY)!;
      expect(despues.spi).toBeCloseTo(antes.spi!, 9);
      expect(despues.cpi).toBeCloseTo(antes.cpi!, 9);
      expect(despues.presupuesto).toBeGreaterThan(antes.presupuesto);
      const sinReporte = (estado: r.ObraState) =>
        alertasObra(delHeroe(estado), estado.cortes, estado.pagos, DEMO_TODAY).filter(
          (a) => a.tipo === "SIN_REPORTE",
        );
      expect(sinReporte(e)).toEqual(sinReporte(obra));
    });
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
