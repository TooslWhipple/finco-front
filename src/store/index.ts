"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  contratoDesdeCotizacion,
  DEMO_TODAY,
  type Cotizacion,
  type EstadoCambio,
  type EtapaTerreno,
  type EventoSync,
  type Local,
  type Prospecto,
  type ReglaActualizacion,
  type Rol,
} from "@/domain";
import { usuarioDeRol, usuarioPorId } from "@/config/usuarios";
import { crearEstadoInicial, type DatosDemo } from "./estado-inicial";
import * as r from "./reducers";

export const CLAVE_STORAGE = "finco-demo";
/** Subir al cambiar la forma del estado persistido: descarta lo viejo. */
export const VERSION_STORAGE = 4;

export interface Acciones {
  iniciarSesion(usuarioId: string): void;
  cambiarRol(rol: Rol): void;
  cerrarSesion(): void;
  crearCotizacion(cotizacion: Cotizacion): void;
  actualizarCotizacion(id: string, parche: Partial<Omit<Cotizacion, "id">>): void;
  solicitarExcepcion(cotizacion: Cotizacion, local: Local, motivo: string): void;
  resolverExcepcion(
    id: string,
    resolucion: "APROBADA" | "RECHAZADA",
    comentario?: string,
  ): void;
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
            ),
          })),
        resolverExcepcion: (id, resolucion, comentario) =>
          set((s) => ({
            aprobaciones: r.resolverExcepcion(
              s.aprobaciones,
              id,
              resolucion,
              actor(),
              comentario,
            ),
          })),
        resolverCambiosAnuales: (localIds, año, resolucion) =>
          set((s) => ({
            aprobaciones: r.resolverCambiosAnuales(
              s.aprobaciones,
              localIds,
              año,
              resolucion,
            ),
          })),
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
        reglasDefault,
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
        reglasDefault,
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
