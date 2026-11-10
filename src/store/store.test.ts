import { beforeEach, describe, expect, it, vi } from "vitest";

const memoria = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
});

const { crearSeed } = await import("@/data/seed");
const { useAppStore, CLAVE_STORAGE } = await import("./index");

describe("store de la demo", () => {
  beforeEach(() => {
    memoria.clear();
    useAppStore.getState().resetDemo();
    useAppStore.getState().cerrarSesion();
  });

  it("cambiar de rol cambia de usuario", () => {
    const s = useAppStore.getState();
    s.iniciarSesion("usr-mariana");
    s.cambiarRol("SUPERADMIN");
    expect(useAppStore.getState().session.usuarioId).toBe("usr-laura");
  });

  it("firma las resoluciones con el usuario de la sesión", () => {
    const s = useAppStore.getState();
    const cot = s.cotizaciones.cotizaciones.find((c) => c.id === "COT-2026-0418")!;
    const local = {
      precioMinimo: 23500,
    } as Parameters<typeof s.solicitarExcepcion>[1];
    s.iniciarSesion("usr-jorge");
    s.solicitarExcepcion(cot, local, "Cliente ancla");
    const exc = useAppStore.getState().aprobaciones.excepciones.at(-1)!;
    expect(exc.solicitadaPor).toBe("Jorge Ramírez");
    s.cambiarRol("DIRECCION");
    useAppStore.getState().autorizarExcepcion(exc.id, "Procede");
    s.cambiarRol("PMO");
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
    s.iniciarSesion("usr-laura");
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

  it("resetDemo deja los datos en el estado inicial y conserva la sesión", () => {
    const s = useAppStore.getState();
    s.iniciarSesion("usr-patricia");
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
    s.ajustarLocal("l1", { precioMinimo: 1 });
    useAppStore.getState().resetDemo();
    const e = useAppStore.getState();
    expect(e.cobranza.seguimientos).toEqual({});
    expect(e.integraciones.sincronizaciones).toEqual({});
    expect(e.integraciones.eventos).toHaveLength(8);
    expect(e.prospectos.prospectos).toEqual(crearSeed().prospectos);
    expect(e.terrenos.terrenos).toEqual(crearSeed().terrenos);
    expect(e.locales.ajustes).toEqual({});
    expect(e.session.usuarioId).toBe("usr-patricia");
  });

  it("persiste solo datos, no funciones", () => {
    useAppStore.getState().iniciarSesion("usr-laura");
    const guardado = JSON.parse(memoria.get(CLAVE_STORAGE)!);
    expect(Object.keys(guardado.state).sort()).toEqual([
      "aprobaciones",
      "cobranza",
      "contratos",
      "cotizaciones",
      "integraciones",
      "locales",
      "mantenimientos",
      "metas",
      "obra",
      "prospectos",
      "reglasDefault",
      "session",
      "terrenos",
    ]);
  });

  it("generar el contrato de una cotización lo crea en borrador y se firma hasta quedar vigente", () => {
    const s = useAppStore.getState();
    s.iniciarSesion("usr-jorge");
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
    s.iniciarSesion("usr-supervisor");
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

    s.cambiarRol("PMO");
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
    s.iniciarSesion("usr-pmo");
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
});
