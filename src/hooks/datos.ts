"use client";

import { useMemo } from "react";
import type { Contrato, EventoSync, Factura, Integracion, Local, Plaza } from "@/domain";
import { plazasConTerrenos } from "@/data/terrenos";
import { usuarioPorId } from "@/config/usuarios";
import { useAppStore } from "@/store";
import {
  aplicarAjuste,
  aplicarReglaDefault,
  aplicarReglaHeredada,
} from "@/store/reducers";
import type { EstadoIntegracion } from "@/services";
import { useConsulta } from "./use-consulta";

/** Usuario y rol de la sesión (nulos sin sesión). */
export function useSesion() {
  const usuarioId = useAppStore((s) => s.session.usuarioId);
  const usuario = usuarioPorId(usuarioId);
  return { usuario, rol: usuario?.rol ?? null };
}

export function useCiudades() {
  return useConsulta((r) => r.plazas.listarCiudades());
}

/** Plazas con la regla por default que se haya editado en la demo. */
export function usePlazas() {
  const base = useConsulta((r) => r.plazas.listarPlazas());
  const reglas = useAppStore((s) => s.reglasDefault);
  const terrenos = useAppStore((s) => s.terrenos.terrenos);
  const ciudades = useCiudades().datos;
  const datos = useMemo(
    () =>
      base.datos && ciudades
        ? plazasConTerrenos(base.datos, terrenos, ciudades).map((p) =>
            aplicarReglaDefault(p, reglas),
          )
        : undefined,
    [base.datos, ciudades, terrenos, reglas],
  );
  return { datos, cargando: base.cargando };
}

export function usePlaza(id: string) {
  const base = useConsulta((r) => r.plazas.obtenerPlaza(id), [id]);
  const reglas = useAppStore((s) => s.reglasDefault);
  const datos = useMemo<Plaza | undefined>(
    () => (base.datos ? aplicarReglaDefault(base.datos, reglas) : undefined),
    [base.datos, reglas],
  );
  return { datos, cargando: base.cargando };
}

export function usePlantas(plazaId: string) {
  return useConsulta((r) => r.plazas.listarPlantas(plazaId), [plazaId]);
}

/** Default de cada plaza en el repositorio, contra el que se decide si un local lo hereda. */
function useReglasBase() {
  return useConsulta((r) => r.configuracion.reglasDefault());
}

/**
 * Locales (de una plaza o todos) con los ajustes hechos en la demo; los que
 * heredan el default de su plaza toman el que se haya editado.
 */
export function useLocales(plazaId?: string) {
  const base = useConsulta(
    (r) => (plazaId ? r.locales.listarPorPlaza(plazaId) : r.locales.listar()),
    [plazaId ?? null],
  );
  const reglasBase = useReglasBase();
  const ajustes = useAppStore((s) => s.locales.ajustes);
  const reglas = useAppStore((s) => s.reglasDefault);
  const datos = useMemo(() => {
    const defaults = reglasBase.datos;
    if (!defaults) return undefined;
    return base.datos?.map((l) =>
      aplicarReglaHeredada(aplicarAjuste(l, ajustes[l.id]), defaults[l.plazaId], reglas),
    );
  }, [base.datos, reglasBase.datos, ajustes, reglas]);
  return { datos, cargando: base.cargando || reglasBase.cargando };
}

export function useLocal(id: string) {
  const base = useConsulta((r) => r.locales.obtener(id), [id]);
  const reglasBase = useReglasBase();
  const ajuste = useAppStore((s) => s.locales.ajustes[id]);
  const reglas = useAppStore((s) => s.reglasDefault);
  const datos = useMemo<Local | undefined>(
    () =>
      base.datos && reglasBase.datos
        ? aplicarReglaHeredada(
            aplicarAjuste(base.datos, ajuste),
            reglasBase.datos[base.datos.plazaId],
            reglas,
          )
        : undefined,
    [base.datos, reglasBase.datos, ajuste, reglas],
  );
  return { datos, cargando: base.cargando || reglasBase.cargando };
}

export function useLocatarios() {
  return useConsulta((r) => r.locales.listarLocatarios());
}

export function useContratos() {
  return useConsulta((r) => r.locales.listarContratos());
}

export function useContratoVigente(localId: string) {
  return useConsulta((r) => r.locales.contratoVigenteDe(localId), [localId]);
}

/** Cotizaciones vivas: viven en el store (parten del seed). */
export function useCotizaciones() {
  return useAppStore((s) => s.cotizaciones.cotizaciones);
}

export function useCotizacion(id: string) {
  const cotizaciones = useCotizaciones();
  return useMemo(() => cotizaciones.find((c) => c.id === id), [cotizaciones, id]);
}

/** Prospectos del embudo comercial: viven en el store (parten del seed). */
export function useProspectos() {
  const datos = useAppStore((s) => s.prospectos.prospectos);
  return { datos, cargando: false };
}

/** Contratos del seed más los que nacieron de cotizaciones en la demo (en cualquier estado). */
export function useContratosVivos() {
  const base = useConsulta((r) => r.contratos.listar());
  const nuevos = useAppStore((s) => s.contratos.nuevos);
  const datos = useMemo<Contrato[] | undefined>(
    () => base.datos && [...base.datos, ...nuevos],
    [base.datos, nuevos],
  );
  return { datos, cargando: base.cargando };
}

/** Terrenos y proyectos en desarrollo: viven en el store (parten del seed). */
export function useTerrenos() {
  const datos = useAppStore((s) => s.terrenos.terrenos);
  return { datos, cargando: false };
}

export function useExcepciones() {
  return useAppStore((s) => s.aprobaciones.excepciones);
}

export function useCambiosAnuales() {
  return useAppStore((s) => s.aprobaciones.cambiosAnuales);
}

/** Cuentas por cobrar del corte, con el seguimiento registrado en la demo. */
export function useFacturas(mes: string) {
  const base = useConsulta((r) => r.cobranza.listarCorte(mes), [mes]);
  const seguimientos = useAppStore((s) => s.cobranza.seguimientos);
  const datos = useMemo<Factura[] | undefined>(
    () =>
      base.datos?.map((f) => {
        const nuevos = seguimientos[f.id];
        if (!nuevos?.length) return f;
        const historial = [...(f.seguimiento ? [f.seguimiento] : []), ...nuevos];
        return { ...f, seguimiento: historial[historial.length - 1], historial };
      }),
    [base.datos, seguimientos],
  );
  return { datos, cargando: base.cargando };
}

/** Estado de EnKontrol; un sync hecho en la demo pisa el `ultimoSync` del seed. */
export function useEstadoIntegracion() {
  const base = useConsulta((r) => r.integraciones.obtenerEstado());
  const ultimoSync = useAppStore((s) => s.integraciones.sincronizaciones.ENKONTROL);
  const datos = useMemo<EstadoIntegracion | undefined>(
    () => (base.datos && ultimoSync ? { ...base.datos, ultimoSync } : base.datos),
    [base.datos, ultimoSync],
  );
  return { datos, cargando: base.cargando };
}

/** Integraciones con el último sync de la demo (si lo hubo) sobre el del seed. */
export function useIntegraciones() {
  const base = useConsulta((r) => r.integraciones.listar());
  const sincronizaciones = useAppStore((s) => s.integraciones.sincronizaciones);
  const datos = useMemo<Integracion[] | undefined>(
    () =>
      base.datos?.map((i) => ({
        ...i,
        ultimoSync: sincronizaciones[i.id] ?? i.ultimoSync,
      })),
    [base.datos, sincronizaciones],
  );
  return { datos, cargando: base.cargando };
}

/** Log de sincronizaciones, del más antiguo al más reciente. */
export function useEventosSync(): EventoSync[] {
  return useAppStore((s) => s.integraciones.eventos);
}

export function useUsuarios() {
  return useConsulta((r) => r.configuracion.listarUsuarios());
}

export function useParametros() {
  return useConsulta((r) => r.configuracion.obtenerParametros());
}
