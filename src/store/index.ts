"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  contratoDesdeCotizacion,
  DEMO_TODAY,
  type Cotizacion,
  type EntradaCorte,
  type EntradaRonda,
  type EstadoCambio,
  type EstatusMantenimiento,
  type EtapaTerreno,
  type EventoSync,
  type Local,
  type Prospecto,
  type ReglaActualizacion,
  type Rol,
} from "@/domain";
import { evidenciaAntes, evidenciaCorte, evidenciaDespues } from "@/data/fotos";
import { usuarioDeRol, usuarioPorId } from "@/config/usuarios";
import { formatMoneda } from "@/lib/format";
import { crearEstadoInicial, type DatosDemo } from "./estado-inicial";
import * as r from "./reducers";

export const CLAVE_STORAGE = "finco-demo";
/** Subir al cambiar la forma del estado persistido: descarta lo viejo. */
export const VERSION_STORAGE = 9;

export interface Acciones {
  iniciarSesion(usuarioId: string): void;
  cambiarRol(rol: Rol): void;
  cerrarSesion(): void;
  crearCotizacion(cotizacion: Cotizacion): void;
  actualizarCotizacion(id: string, parche: Partial<Omit<Cotizacion, "id">>): void;
  solicitarExcepcion(cotizacion: Cotizacion, local: Local, motivo: string): void;
  /** Dirección autoriza una excepción pendiente. */
  autorizarExcepcion(id: string, comentario?: string): void;
  /** La PMO aplica una excepción autorizada y deja constancia en el local. */
  aplicarExcepcion(id: string, comentario?: string): void;
  /** Dirección (pendientes) o la PMO (autorizadas) rechazan; el comentario es obligatorio. */
  rechazarExcepcion(id: string, comentario: string): void;
  /** La PMO fija la meta de cumplimiento del plan de ingresos de una plaza, en %. */
  establecerMetaPlaza(plazaId: string, metaPct: number): void;
  resolverCambiosAnuales(
    localIds: readonly string[],
    año: number,
    resolucion: Exclude<EstadoCambio, "PENDIENTE">,
  ): void;
  registrarSeguimiento(facturaId: string, texto: string): void;
  registrarAvisos(facturaIds: readonly string[], texto: string): void;
  /** Anota una sincronización en el log y fija el último sync de la integración. */
  registrarSync(evento: Omit<EventoSync, "id">): void;
  registrarProspecto(prospecto: Prospecto): void;
  avanzarProspecto(id: string): void;
  descartarProspecto(id: string): void;
  /**
   * Genera el contrato de una cotización: aplica los términos capturados,
   * marca la cotización y crea el contrato en borrador.
   */
  generarContrato(cotizacionId: string, terminos: Partial<Omit<Cotizacion, "id">>): void;
  enviarContratoAFirma(id: string): void;
  /** Deja vigente un contrato en firma y registra su alta en EnKontrol. */
  registrarFirmaContrato(id: string, ahora: string): void;
  moverEtapaTerreno(id: string, etapa: EtapaTerreno): void;
  actualizarAvanceTerreno(id: string, avancePct: number): void;
  /** Alta de un mantenimiento programado, con el siguiente folio. */
  crearMantenimiento(nuevo: r.NuevoMantenimiento): void;
  /**
   * Mueve un mantenimiento de estatus: al iniciar adjunta una foto del "antes", al
   * finalizar (con `costoReal`) una del "después".
   */
  transicionarMantenimiento(
    id: string,
    destino: EstatusMantenimiento,
    costoReal?: number,
  ): void;
  /** El Supervisor captura y firma el corte de la semana, con fotos simuladas de evidencia. */
  registrarCorte(entrada: EntradaCorte): void;
  /** La PMO valida un corte firmado: desde ahí cuenta para el avance. */
  validarCorte(id: string): void;
  /** La PMO rechaza un corte firmado; el comentario es obligatorio. */
  rechazarCorte(id: string, comentario: string): void;
  /** La PMO captura la siguiente ronda de propuestas de una licitación en curso. */
  registrarRonda(licitacionId: string, entrada: EntradaRonda): void;
  /** La PMO saca a un proveedor de la competencia; el motivo es obligatorio. */
  descartarProveedor(licitacionId: string, proveedorId: string, motivo: string): void;
  /** La PMO adjudica la licitación al ganador de la última ronda, con su motivo. */
  adjudicarLicitacion(licitacionId: string, ganadorId: string, motivo: string): void;
  establecerReglaDefault(plazaId: string, regla: ReglaActualizacion): void;
  ajustarLocal(localId: string, ajuste: r.AjusteLocal): void;
  /** Vuelve todo al estado inicial, conservando la sesión actual. */
  resetDemo(): void;
}

export type AppState = DatosDemo & Acciones;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Nombre de quien actúa; sin sesión no hay acciones con firma. */
      const actor = () => {
        return usuarioPorId(get().session.usuarioId)?.nombre ?? "Sistema";
      };
      return {
        ...crearEstadoInicial(),
        iniciarSesion: (usuarioId) => set({ session: { usuarioId } }),
        cambiarRol: (rol) => set({ session: { usuarioId: usuarioDeRol(rol).id } }),
        cerrarSesion: () => set({ session: { usuarioId: null } }),
        crearCotizacion: (cotizacion) =>
          set((s) => ({ cotizaciones: r.agregarCotizacion(s.cotizaciones, cotizacion) })),
        actualizarCotizacion: (id, parche) =>
          set((s) => ({
            cotizaciones: r.actualizarCotizacion(s.cotizaciones, id, parche),
          })),
        solicitarExcepcion: (cotizacion, local, motivo) =>
          set((s) => ({
            aprobaciones: r.solicitarExcepcion(
              s.aprobaciones,
              cotizacion,
              local,
              actor(),
              motivo,
              DEMO_TODAY,
            ),
          })),
        autorizarExcepcion: (id, comentario) =>
          set((s) => ({
            aprobaciones: r.autorizarExcepcion(
              s.aprobaciones,
              id,
              actor(),
              DEMO_TODAY,
              comentario,
            ),
          })),
        aplicarExcepcion: (id, comentario) =>
          set((s) => {
            const excepcion = s.aprobaciones.excepciones.find((e) => e.id === id);
            if (excepcion?.estado !== "AUTORIZADA_DIRECCION") return s;
            return {
              aprobaciones: r.aplicarExcepcion(
                s.aprobaciones,
                id,
                actor(),
                DEMO_TODAY,
                comentario,
              ),
              locales: r.registrarBitacoraLocal(s.locales, excepcion.localId, {
                fecha: DEMO_TODAY,
                autor: actor(),
                titulo: "Excepción de precio aplicada",
                detalle: `Excepción ${excepcion.id} aplicada: renta ${formatMoneda(excepcion.rentaSolicitada)} (mínimo ${formatMoneda(excepcion.precioMinimo)})`,
              }),
            };
          }),
        rechazarExcepcion: (id, comentario) =>
          set((s) => ({
            aprobaciones: r.rechazarExcepcion(
              s.aprobaciones,
              id,
              actor(),
              DEMO_TODAY,
              comentario,
            ),
          })),
        establecerMetaPlaza: (plazaId, metaPct) =>
          set((s) => ({ metas: r.establecerMeta(s.metas, plazaId, metaPct) })),
        resolverCambiosAnuales: (localIds, año, resolucion) =>
          set((s) => {
            const aprobaciones = r.resolverCambiosAnuales(
              s.aprobaciones,
              localIds,
              año,
              resolucion,
            );
            if (resolucion !== "APROBADO") return { aprobaciones };
            const objetivo = new Set(localIds);
            const aprobados = s.aprobaciones.cambiosAnuales.filter(
              (c) => c.año === año && objetivo.has(c.localId) && c.estado === "PENDIENTE",
            );
            const locales = aprobados.reduce(
              (estado, c) =>
                r.registrarBitacoraLocal(estado, c.localId, {
                  fecha: DEMO_TODAY,
                  autor: actor(),
                  titulo: `Actualización anual ${año} aprobada`,
                  detalle: `Lista ${formatMoneda(c.precioActual)} → ${formatMoneda(c.precioPropuesto)} · mínimo ${formatMoneda(c.minimoActual)} → ${formatMoneda(c.minimoPropuesto)}, a partir del 1 de enero`,
                }),
              s.locales,
            );
            return { aprobaciones, locales };
          }),
        registrarSeguimiento: (facturaId, texto) =>
          set((s) => ({
            cobranza: r.registrarSeguimiento(s.cobranza, facturaId, texto),
          })),
        registrarAvisos: (facturaIds, texto) =>
          set((s) => ({ cobranza: r.registrarAvisos(s.cobranza, facturaIds, texto) })),
        registrarSync: (evento) =>
          set((s) => ({ integraciones: r.registrarSync(s.integraciones, evento) })),
        registrarProspecto: (prospecto) =>
          set((s) => ({ prospectos: r.registrarProspecto(s.prospectos, prospecto) })),
        avanzarProspecto: (id) =>
          set((s) => ({ prospectos: r.avanzarProspecto(s.prospectos, id, DEMO_TODAY) })),
        descartarProspecto: (id) =>
          set((s) => ({
            prospectos: r.descartarProspecto(s.prospectos, id, DEMO_TODAY),
          })),
        generarContrato: (cotizacionId, terminos) =>
          set((s) => {
            const actual = s.cotizaciones.cotizaciones.find((c) => c.id === cotizacionId);
            if (!actual || actual.estado === "CONTRATO_GENERADO") return s;
            const generada: Cotizacion = {
              ...actual,
              ...terminos,
              estado: "CONTRATO_GENERADO",
              contratoGeneradoEl: DEMO_TODAY,
            };
            return {
              cotizaciones: r.actualizarCotizacion(
                s.cotizaciones,
                cotizacionId,
                generada,
              ),
              contratos: r.agregarContrato(
                s.contratos,
                contratoDesdeCotizacion(generada),
              ),
            };
          }),
        enviarContratoAFirma: (id) =>
          set((s) => ({ contratos: r.enviarAFirma(s.contratos, id) })),
        registrarFirmaContrato: (id, ahora) =>
          set((s) => {
            const contrato = s.contratos.nuevos.find((c) => c.id === id);
            if (contrato?.estado !== "EN_FIRMA") return s;
            return {
              contratos: r.registrarFirma(s.contratos, id),
              integraciones: r.registrarSync(s.integraciones, {
                integracionId: "ENKONTROL",
                fecha: ahora,
                resultado: "OK",
                detalle: `Alta del contrato ${contrato.folio ?? contrato.id} y su locatario`,
                registros: 1,
              }),
            };
          }),
        moverEtapaTerreno: (id, etapa) =>
          set((s) => ({ terrenos: r.moverEtapaTerreno(s.terrenos, id, etapa) })),
        actualizarAvanceTerreno: (id, avancePct) =>
          set((s) => ({
            terrenos: r.actualizarAvanceTerreno(s.terrenos, id, avancePct),
          })),
        crearMantenimiento: (nuevo) =>
          set((s) => ({
            mantenimientos: r.agregarMantenimiento(s.mantenimientos, nuevo, DEMO_TODAY),
          })),
        transicionarMantenimiento: (id, destino, costoReal) =>
          set((s) => {
            const actual = s.mantenimientos.mantenimientos.find((m) => m.id === id);
            if (!actual) return s;
            const evidencia =
              destino === "EN_PROCESO"
                ? evidenciaAntes(actual.categoria, actual.id, actual.evidencia)
                : destino === "FINALIZADO"
                  ? evidenciaDespues(actual.categoria, actual.id, actual.evidencia)
                  : [];
            return {
              mantenimientos: r.transicionarMantenimiento(s.mantenimientos, id, destino, {
                hoy: DEMO_TODAY,
                costoReal,
                evidencia,
              }),
            };
          }),
        registrarCorte: (entrada) =>
          set((s) => ({
            obra: r.registrarCorte(
              s.obra,
              entrada,
              actor(),
              DEMO_TODAY,
              evidenciaCorte(`${entrada.contratoObraId}-${entrada.semana}`),
            ),
          })),
        validarCorte: (id) =>
          set((s) => ({
            obra: r.resolverCorteObra(s.obra, id, "VALIDADO_PMO", actor(), DEMO_TODAY),
          })),
        rechazarCorte: (id, comentario) =>
          set((s) => ({
            obra: r.resolverCorteObra(
              s.obra,
              id,
              "RECHAZADO",
              actor(),
              DEMO_TODAY,
              comentario,
            ),
          })),
        registrarRonda: (licitacionId, entrada) =>
          set((s) => ({
            obra: r.registrarRonda(s.obra, licitacionId, entrada, DEMO_TODAY),
          })),
        descartarProveedor: (licitacionId, proveedorId, motivo) =>
          set((s) => ({
            obra: r.descartarProveedor(s.obra, licitacionId, proveedorId, motivo),
          })),
        adjudicarLicitacion: (licitacionId, ganadorId, motivo) =>
          set((s) => ({
            obra: r.adjudicarLicitacion(
              s.obra,
              licitacionId,
              ganadorId,
              motivo,
              actor(),
              DEMO_TODAY,
            ),
          })),
        establecerReglaDefault: (plazaId, regla) =>
          set((s) => ({
            reglasDefault: r.establecerReglaDefault(s.reglasDefault, plazaId, regla),
          })),
        ajustarLocal: (localId, ajuste) =>
          set((s) => ({ locales: r.ajustarLocal(s.locales, localId, ajuste) })),
        resetDemo: () => set({ ...crearEstadoInicial(), session: get().session }),
      };
    },
    {
      name: CLAVE_STORAGE,
      version: VERSION_STORAGE,
      // Forma anterior incompatible: se descarta y se arranca sin sesión (sin error en consola).
      migrate: (): DatosDemo => crearEstadoInicial(),
      storage: createJSONStorage(() => localStorage),
      // Se rehidrata a mano tras montar para evitar mismatch de hidratación SSR.
      skipHydration: true,
      partialize: ({
        session,
        cotizaciones,
        aprobaciones,
        cobranza,
        integraciones,
        locales,
        prospectos,
        contratos,
        terrenos,
        obra,
        mantenimientos,
        reglasDefault,
        metas,
      }): DatosDemo => ({
        session,
        cotizaciones,
        aprobaciones,
        cobranza,
        integraciones,
        locales,
        prospectos,
        contratos,
        terrenos,
        obra,
        mantenimientos,
        reglasDefault,
        metas,
      }),
    },
  ),
);

/** `true` cuando el store ya leyó localStorage (siempre `false` en el servidor). */
export function useStoreHidratado(): boolean {
  return useSyncExternalStore(
    (aviso) => useAppStore.persist.onFinishHydration(aviso),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
}
