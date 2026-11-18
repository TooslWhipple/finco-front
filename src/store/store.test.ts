import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_TODAY, documentosFaltantes, expedienteCompleto } from "@/domain";
import { crearContrato } from "@/domain/fixtures";
import { AHORA_DEMO } from "@/lib/tiempo";

const memoria = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
});

const { crearSeed } = await import("@/data/seed");
const { useAppStore, CLAVE_STORAGE } = await import("./index");
const { useSesionStore } = await import("./sesion");

/** Fija la sesión como lo haría la respuesta de `/api/sesion` (la valida el servidor). */
function entrarComo(usuarioId: string | null): void {
  useSesionStore.setState({
    usuarioId,
    cuentaUsuarioId: usuarioId,
    puedeSuplantar: false,
    cargada: true,
  });
}

describe("store de la demo", () => {
  beforeEach(() => {
    memoria.clear();
    useAppStore.getState().resetDemo();
    entrarComo(null);
  });

  it("firma las resoluciones con el usuario de la sesión", () => {
    const s = useAppStore.getState();
    const cot = s.cotizaciones.cotizaciones.find((c) => c.id === "COT-2026-0418")!;
    const local = {
      precioMinimo: 23500,
    } as Parameters<typeof s.solicitarExcepcion>[1];
    entrarComo("usr-jorge");
    s.solicitarExcepcion(cot, local, "Cliente ancla");
    const exc = useAppStore.getState().aprobaciones.excepciones.at(-1)!;
    expect(exc.solicitadaPor).toBe("Jorge Ramírez");
    entrarComo("usr-mariana");
    useAppStore.getState().autorizarExcepcion(exc.id, "Procede");
    entrarComo("usr-pmo");
    useAppStore.getState().aplicarExcepcion(exc.id);
    const resuelta = useAppStore
      .getState()
      .aprobaciones.excepciones.find((e) => e.id === exc.id)!;
    expect(resuelta).toMatchObject({
      estado: "APLICADA",
      autorizadaPor: "Mariana López",
      aplicadaPor: "Ricardo Salas",
    });
    const bitacora = useAppStore.getState().locales.ajustes[exc.localId]?.bitacora;
    expect(bitacora?.at(-1)?.detalle).toContain(`Excepción ${exc.id} aplicada`);
  });

  it("aprobar la actualización anual deja constancia de lista y mínimo en el local", () => {
    const s = useAppStore.getState();
    entrarComo("usr-laura");
    const cambio = s.aprobaciones.cambiosAnuales[0];
    s.resolverCambiosAnuales([cambio.localId], cambio.año, "APROBADO");
    const bitacora = useAppStore.getState().locales.ajustes[cambio.localId]?.bitacora;
    expect(bitacora?.at(-1)).toMatchObject({
      titulo: `Actualización anual ${cambio.año} aprobada`,
    });
    expect(bitacora?.at(-1)?.detalle).toContain("mínimo");
  });

  it("la PMO fija la meta de ingresos de una plaza", () => {
    useAppStore.getState().establecerMetaPlaza("plz-alborada", 96.5);
    expect(useAppStore.getState().metas.porPlaza["plz-alborada"]).toBe(96.5);
  });

  it("resetDemo deja los datos en el estado inicial y no toca la sesión", () => {
    const s = useAppStore.getState();
    entrarComo("usr-patricia");
    s.registrarSeguimiento("f1", "x");
    s.registrarSync({
      integracionId: "ENKONTROL",
      fecha: "2026-11-03T12:00:00",
      resultado: "OK",
      detalle: "Manual",
      registros: 1,
    });
    s.avanzarProspecto(useAppStore.getState().prospectos.prospectos[0].id);
    s.moverEtapaTerreno(useAppStore.getState().terrenos.terrenos[0].id, "ABIERTO");
    s.editarCampana({ ...useAppStore.getState().campanas.campanas[0], inversion: 1 });
    s.ajustarLocal("l1", { precioMinimo: 1 });
    useAppStore.getState().resetDemo();
    const e = useAppStore.getState();
    expect(e.cobranza.seguimientos).toEqual({});
    expect(e.integraciones.sincronizaciones).toEqual({});
    expect(e.integraciones.eventos).toHaveLength(8);
    expect(e.prospectos.prospectos).toEqual(crearSeed().prospectos);
    expect(e.terrenos.terrenos).toEqual(crearSeed().terrenos);
    expect(e.proveedores.padron).toEqual(crearSeed().proveedores);
    expect(e.campanas.campanas).toEqual(crearSeed().campanas);
    expect(e.locales.ajustes).toEqual({});
    expect(useSesionStore.getState().usuarioId).toBe("usr-patricia");
  });

  it("persiste solo datos, no funciones ni la sesión", () => {
    entrarComo("usr-laura");
    useAppStore.getState().registrarSeguimiento("f1", "x");
    const guardado = JSON.parse(memoria.get(CLAVE_STORAGE)!);
    expect(Object.keys(guardado.state).sort()).toEqual([
      "aprobaciones",
      "campanas",
      "casos",
      "cobranza",
      "comisiones",
      "contratos",
      "cotizaciones",
      "integraciones",
      "locales",
      "mantenimientos",
      "metas",
      "obra",
      "prospectos",
      "proveedores",
      "reglasDefault",
      "terrenos",
    ]);
  });

  describe("casos de servicio", () => {
    const fuga = () =>
      useAppStore
        .getState()
        .casos.casos.find(
          (c) =>
            c.tipo === "FUGA" &&
            c.mantenimientoId === undefined &&
            c.estatus !== "CERRADO",
        )!;
    const correctivo = (plazaId: string) => ({
      plazaId,
      titulo: "Fuga en el baño",
      descripcion: "Reportada por el locatario",
      tipo: "PREVENTIVO" as const,
      categoria: "PLOMERIA" as const,
      origen: "ADMINISTRACION" as const,
      proveedorId: "prv-3",
      fechaProgramada: "2026-11-04",
      costoEstimado: 0,
      cargoA: "PLAZA" as const,
    });

    it("escalar una fuga crea un correctivo de locatario en su local, ligado al caso con bitácora, y no se duplica", () => {
      entrarComo("usr-atencion");
      const caso = fuga();
      const antes = useAppStore.getState().mantenimientos.mantenimientos.length;
      useAppStore.getState().escalarCasoAMantenimiento(caso.id, correctivo(caso.plazaId));
      let e = useAppStore.getState();
      const creado = e.mantenimientos.mantenimientos.at(-1)!;
      expect(e.mantenimientos.mantenimientos).toHaveLength(antes + 1);
      expect(creado).toMatchObject({
        tipo: "CORRECTIVO",
        origen: "LOCATARIO",
        plazaId: caso.plazaId,
        localId: caso.localId,
      });
      const ligado = e.casos.casos.find((c) => c.id === caso.id)!;
      expect(ligado.mantenimientoId).toBe(creado.id);
      expect(ligado.bitacora.at(-1)).toMatchObject({
        autor: "Andrea Robles",
        texto: expect.stringContaining(creado.folio),
      });
      useAppStore.getState().escalarCasoAMantenimiento(caso.id, correctivo(caso.plazaId));
      e = useAppStore.getState();
      expect(e.mantenimientos.mantenimientos).toHaveLength(antes + 1);
    });

    it("responder dos veces conserva la primera respuesta y marcar resuelto fija resueltoEl", () => {
      entrarComo("usr-atencion");
      useAppStore.getState().registrarCaso({
        plazaId: "plz-alborada",
        localId: "plz-alborada-A-01",
        locatarioId: "loc-0001",
        tipo: "FUGA",
        prioridad: "ALTA",
        canal: "WHATSAPP",
        descripcion: "Fuga",
      });
      const id = useAppStore.getState().casos.casos.at(-1)!.id;
      useAppStore.getState().responderCaso(id, "Vamos para allá");
      const primera = useAppStore.getState().casos.casos.find((c) => c.id === id)!;
      expect(primera).toMatchObject({
        estatus: "EN_ATENCION",
        responsableId: "usr-atencion",
      });
      expect(primera.primeraRespuestaEl).toBeDefined();
      entrarComo("usr-laura");
      useAppStore.getState().responderCaso(id, "Seguimos en ello");
      const segunda = useAppStore.getState().casos.casos.find((c) => c.id === id)!;
      expect(segunda.primeraRespuestaEl).toBe(primera.primeraRespuestaEl);
      expect(segunda.responsableId).toBe("usr-atencion");
      expect(segunda.bitacora).toHaveLength(primera.bitacora.length + 1);
      useAppStore.getState().transicionarCaso(id, "RESUELTO");
      const resuelto = useAppStore.getState().casos.casos.find((c) => c.id === id)!;
      expect(resuelto.estatus).toBe("RESUELTO");
      expect(resuelto.resueltoEl).toBeDefined();
    });

    it("sin sesión no se responde", () => {
      const caso = useAppStore
        .getState()
        .casos.casos.find((c) => c.estatus === "RECIBIDO")!;
      useAppStore.getState().responderCaso(caso.id, "Hola");
      expect(useAppStore.getState().casos.casos.find((c) => c.id === caso.id)).toEqual(
        caso,
      );
    });
  });

  it("generar el contrato de una cotización lo crea en borrador y se firma hasta quedar vigente", () => {
    const s = useAppStore.getState();
    entrarComo("usr-jorge");
    s.generarContrato("COT-2026-0418", { rentaMensual: 24_000 });
    let e = useAppStore.getState();
    const cot = e.cotizaciones.cotizaciones.find((c) => c.id === "COT-2026-0418")!;
    expect(cot).toMatchObject({ estado: "CONTRATO_GENERADO", rentaMensual: 24_000 });
    expect(e.contratos.nuevos).toHaveLength(1);
    expect(e.contratos.nuevos[0]).toMatchObject({
      estado: "BORRADOR",
      folio: "CTR-2026-0418",
      rentaMensual: 24_000,
    });
    // Generar de nuevo no duplica el contrato.
    s.generarContrato("COT-2026-0418", {});
    expect(useAppStore.getState().contratos.nuevos).toHaveLength(1);

    const eventosAntes = e.integraciones.eventos.length;
    const id = e.contratos.nuevos[0].id;
    // Sin pasar por firma, registrar la firma no hace nada.
    s.registrarFirmaContrato(id, "2026-11-03T16:00:00");
    expect(useAppStore.getState().contratos.nuevos[0].estado).toBe("BORRADOR");
    s.enviarContratoAFirma(id);
    s.registrarFirmaContrato(id, "2026-11-03T16:00:00");
    e = useAppStore.getState();
    expect(e.contratos.nuevos[0].estado).toBe("VIGENTE");
    expect(e.integraciones.eventos).toHaveLength(eventosAntes + 1);
    expect(e.integraciones.eventos.at(-1)).toMatchObject({
      integracionId: "ENKONTROL",
      detalle: expect.stringContaining("CTR-2026-0418"),
    });
    expect(e.integraciones.sincronizaciones.ENKONTROL).toBe("2026-11-03T16:00:00");
  });

  it("firmar el contrato genera sus comisiones con el esquema vigente, como foto fija", () => {
    const s = useAppStore.getState();
    entrarComo("usr-sergio");
    const cot = s.cotizaciones.cotizaciones.find((c) => c.id === "COT-2026-0418")!;
    expect(cot).toMatchObject({ plazoMeses: 36, mesesGracia: 1 });
    s.generarContrato("COT-2026-0418", { rentaMensual: 24_000 });
    const id = useAppStore.getState().contratos.nuevos[0].id;
    s.enviarContratoAFirma(id);
    const eventosAntes = useAppStore.getState().integraciones.eventos.length;
    s.registrarFirmaContrato(id, AHORA_DEMO);

    const e = useAppStore.getState();
    expect(e.integraciones.eventos).toHaveLength(eventosAntes + 1);
    expect(e.integraciones.eventos.at(-1)).toMatchObject({
      integracionId: "ENKONTROL",
      fecha: AHORA_DEMO,
      resultado: "OK",
      detalle: "Alta del contrato CTR-2026-0418 y su locatario",
      registros: 1,
    });
    const delContrato = () =>
      useAppStore.getState().comisiones.comisiones.filter((c) => c.contratoId === id);
    const resumen = () => delContrato().map((c) => [c.concepto, c.usuarioId, c.base, c.monto]);
    const esperado = [
      ["ASESOR", cot.vendedorId, 264_000, 10_560],
      ["BONO_SIN_EXCEPCION", cot.vendedorId, 264_000, 2_640],
      ["MANDO_MEDIO", "usr-jorge", 264_000, 2_640],
    ];
    expect(resumen()).toEqual(esperado);
    expect(delContrato().every((c) => c.generadaEl === AHORA_DEMO.slice(0, 10))).toBe(true);

    // Editar el esquema después no cambia lo ya generado.
    s.editarEsquemaComisiones({ ...e.comisiones.esquema, asesorPct: 5 });
    expect(useAppStore.getState().comisiones.esquema.asesorPct).toBe(5);
    expect(resumen()).toEqual(esperado);
    // Una segunda firma no duplica ni recalcula.
    s.registrarFirmaContrato(id, AHORA_DEMO);
    expect(resumen()).toEqual(esperado);

    const [asesor] = delContrato();
    s.marcarComisionPagada(asesor.id, DEMO_TODAY);
    expect(delContrato()[0].pagadaEl).toBe(DEMO_TODAY);
  });

  it("generar el contrato de una cotización ligada a un prospecto en negociación lo gana una sola vez", () => {
    const s = useAppStore.getState();
    const cot = s.cotizaciones.cotizaciones.find((c) => c.id === "COT-2026-0409")!;
    const antes = s.prospectos.prospectos.find((p) => p.id === cot.prospectoId)!;
    expect(antes.etapa).toBe("NEGOCIACION");
    entrarComo("usr-sofia");
    s.generarContrato(cot.id, {});
    const contrato = useAppStore.getState().contratos.nuevos[0];
    const folio = contrato.folio ?? contrato.id;
    const ganado = () =>
      useAppStore.getState().prospectos.prospectos.find((p) => p.id === antes.id)!;
    expect(ganado().etapa).toBe("GANADO");
    expect(ganado().actividad).toHaveLength(antes.actividad.length + 1);
    expect(ganado().actividad.at(-1)).toMatchObject({
      titulo: `Contrato ${folio} generado`,
      fecha: DEMO_TODAY,
    });
    // Generarlo de nuevo no duplica la actividad.
    useAppStore.getState().generarContrato(cot.id, {});
    expect(ganado().actividad).toHaveLength(antes.actividad.length + 1);
  });

  it("completar el expediente de un prospecto recalcula su cotización abierta en el mismo paso", () => {
    const s = useAppStore.getState();
    const cot = s.cotizaciones.cotizaciones.find(
      (c) =>
        (c.estado === "BORRADOR" || c.estado === "ENVIADA") &&
        !c.prospecto.documentosCompletos &&
        c.prospectoId,
    )!;
    expect(cot).toBeDefined();
    const prospecto = s.prospectos.prospectos.find((p) => p.id === cot.prospectoId)!;
    for (const tipo of documentosFaltantes(prospecto))
      useAppStore.getState().registrarDocumentoProspecto(prospecto.id, tipo, true);
    const e = useAppStore.getState();
    const actualizado = e.prospectos.prospectos.find((p) => p.id === prospecto.id)!;
    expect(expedienteCompleto(actualizado)).toBe(true);
    expect(
      e.cotizaciones.cotizaciones.find((c) => c.id === cot.id)!.prospecto
        .documentosCompletos,
    ).toBe(true);
  });

  it("resetDemo borra los contratos y las reglas editadas", () => {
    const s = useAppStore.getState();
    s.generarContrato("COT-2026-0418", {});
    s.establecerReglaDefault("plz-alborada", {
      tipo: "INPC",
      cuando: "ENERO",
      modo: "AUTOMATICO",
    });
    useAppStore.getState().resetDemo();
    const e = useAppStore.getState();
    expect(e.contratos.nuevos).toEqual([]);
    expect(e.reglasDefault.porPlaza).toEqual({});
  });

  it("crea un mantenimiento programado, lo inicia y lo finaliza con evidencia", () => {
    const s = useAppStore.getState();
    const antes = s.mantenimientos.mantenimientos.length;
    s.crearMantenimiento({
      plazaId: "plz-alborada",
      localId: "plz-alborada-C-09",
      titulo: "Fuga",
      descripcion: "",
      tipo: "CORRECTIVO",
      categoria: "PLOMERIA",
      origen: "LOCATARIO",
      proveedorId: "prv-4",
      fechaProgramada: "2026-11-05",
      costoEstimado: 5000,
      cargoA: "PLAZA",
    });
    let lista = useAppStore.getState().mantenimientos.mantenimientos;
    expect(lista).toHaveLength(antes + 1);
    const nuevo = lista.at(-1)!;
    expect(nuevo).toMatchObject({ estatus: "PROGRAMADO", evidencia: [] });
    expect(nuevo.folio).toBe(`MNT-2026-${String(antes + 1).padStart(4, "0")}`);

    s.transicionarMantenimiento(nuevo.id, "FINALIZADO", 100);
    expect(useAppStore.getState().mantenimientos.mantenimientos.at(-1)!.estatus).toBe(
      "PROGRAMADO",
    );
    s.transicionarMantenimiento(nuevo.id, "EN_PROCESO");
    lista = useAppStore.getState().mantenimientos.mantenimientos;
    expect(lista.at(-1)).toMatchObject({
      estatus: "EN_PROCESO",
      fechaInicio: "2026-11-03",
    });
    expect(lista.at(-1)!.evidencia).toHaveLength(1);

    s.transicionarMantenimiento(nuevo.id, "FINALIZADO");
    expect(useAppStore.getState().mantenimientos.mantenimientos.at(-1)!.estatus).toBe(
      "EN_PROCESO",
    );
    s.transicionarMantenimiento(nuevo.id, "FINALIZADO", 5400);
    const fin = useAppStore.getState().mantenimientos.mantenimientos.at(-1)!;
    expect(fin).toMatchObject({
      estatus: "FINALIZADO",
      costoReal: 5400,
      fechaFin: "2026-11-03",
    });
    expect(fin.evidencia).toHaveLength(2);
    expect(new Set(fin.evidencia.map((f) => f.src)).size).toBe(2);
  });

  it("resetDemo revierte los mantenimientos creados", () => {
    const s = useAppStore.getState();
    const antes = s.mantenimientos.mantenimientos.length;
    s.crearMantenimiento({
      plazaId: "plz-alborada",
      titulo: "x",
      descripcion: "",
      tipo: "PREVENTIVO",
      categoria: "LIMPIEZA",
      origen: "ADMINISTRACION",
      proveedorId: "prv-6",
      fechaProgramada: "2026-12-01",
      costoEstimado: 1000,
      cargoA: "PLAZA",
    });
    useAppStore.getState().resetDemo();
    expect(useAppStore.getState().mantenimientos.mantenimientos).toHaveLength(antes);
  });

  it("el Supervisor firma un corte con fotos y la PMO lo valida o rechaza", () => {
    const s = useAppStore.getState();
    const muros = s.obra.contratos.find(
      (c) => c.terrenoId === "ter-09" && c.partida === "MUROS",
    )!;
    entrarComo("usr-supervisor");
    s.registrarCorte({
      contratoObraId: muros.id,
      semana: "2026-10-26",
      volumenes: [{ conceptoId: muros.conceptos[0].id, volumen: 300 }],
    });
    const corte = useAppStore.getState().obra.cortes.at(-1)!;
    expect(corte).toMatchObject({
      estado: "FIRMADO_SUPERVISOR",
      capturadoPor: "Héctor Ramos",
    });
    expect(corte.evidencia.length).toBeGreaterThan(0);

    entrarComo("usr-pmo");
    s.rechazarCorte(corte.id, "");
    expect(useAppStore.getState().obra.cortes.at(-1)!.estado).toBe("FIRMADO_SUPERVISOR");
    s.validarCorte(corte.id);
    expect(useAppStore.getState().obra.cortes.at(-1)).toMatchObject({
      estado: "VALIDADO_PMO",
      validadoPor: "Ricardo Salas",
    });
  });

  it("liberar el local de un contrato por vencer lo deja disponible con el repricing aplicado", () => {
    const seed = crearSeed();
    const local = seed.locales.find((l) => l.id === "plz-alborada-A-05")!;
    const contrato = seed.contratos.find((c) => c.localId === local.id)!;
    expect(contrato.estado).toBe("VIGENTE");
    const s = useAppStore.getState();
    entrarComo("usr-pmo");
    s.liberarLocal(local, contrato, "2026-11-10", "Fin de relación");
    const est = useAppStore.getState();
    expect(est.contratos.terminaciones[contrato.id]).toEqual({
      fecha: "2026-11-10",
      motivo: "Fin de relación",
    });
    const ajuste = est.locales.ajustes[local.id];
    expect(ajuste.estatus).toBe("DISPONIBLE");
    expect(ajuste.precioVigente).toBeGreaterThan(local.precioVigente);
    expect(ajuste.precioMinimo).toBeGreaterThan(local.precioMinimo);
    expect(ajuste.historial?.slice(-2).map((h) => h.concepto)).toEqual([
      "LISTA",
      "MINIMO",
    ]);
    expect(ajuste.historial?.at(-1)?.motivo).toContain("Repricing al liberar (regla");
    expect(ajuste.bitacora?.at(-1)?.titulo).toBe("Local liberado");
    // Liberar dos veces no vuelve a repreciar.
    useAppStore.getState().liberarLocal(local, contrato, "2026-11-11", "Otra vez");
    expect(useAppStore.getState().locales.ajustes[local.id]).toEqual(ajuste);
  });

  it("un contrato no vigente no se libera", () => {
    const seed = crearSeed();
    const local = seed.locales.find((l) => l.id === "plz-alborada-A-05")!;
    const contrato = {
      ...seed.contratos.find((c) => c.localId === local.id)!,
      estado: "TERMINADO" as const,
    };
    useAppStore.getState().liberarLocal(local, contrato, "2026-11-10", "x");
    expect(useAppStore.getState().locales.ajustes[local.id]).toBeUndefined();
  });

  describe("registrarApertura", () => {
    const contrato = crearContrato({ id: "ctr-apertura", inicio: "2026-06-01" });

    it("guarda el usuario de la sesión y la fecha de la demo, sin sobrescribir", () => {
      const s = useAppStore.getState();
      entrarComo("usr-pmo");
      s.registrarApertura(contrato, "2026-10-20");
      expect(useAppStore.getState().contratos.aperturas[contrato.id]).toEqual({
        fecha: "2026-10-20",
        registradaPor: "usr-pmo",
        registradaEl: DEMO_TODAY,
      });
      useAppStore.getState().registrarApertura(contrato, "2026-10-25");
      expect(useAppStore.getState().contratos.aperturas[contrato.id].fecha).toBe(
        "2026-10-20",
      );
    });

    it("sin sesión no registra", () => {
      useAppStore.getState().registrarApertura(contrato, "2026-10-20");
      expect(useAppStore.getState().contratos.aperturas).toEqual({});
    });

    it("una fecha fuera de [inicio, hoy] no registra", () => {
      const s = useAppStore.getState();
      entrarComo("usr-pmo");
      s.registrarApertura(contrato, "2026-05-31");
      s.registrarApertura(contrato, "2026-11-04");
      expect(useAppStore.getState().contratos.aperturas).toEqual({});
    });
  });
});
