"use client";

import { useMemo } from "react";
import {
  aplicarResumenObra,
  DEMO_TODAY,
  filtrarPorUbicacion,
  resumenObra,
  type Contrato,
  type EventoSync,
  type Factura,
  type Integracion,
  type Local,
  type Plaza,
} from "@/domain";
import { plazasConTerrenos } from "@/data/terrenos";
import { usuarioPorId } from "@/config/usuarios";
import { useAppStore } from "@/store";
import {
  aplicarAjuste,
  aplicarMeta,
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

/** Plazas con la regla por default y la meta de ingresos que se hayan editado en la demo. */
export function usePlazas() {
  const base = useConsulta((r) => r.plazas.listarPlazas());
  const reglas = useAppStore((s) => s.reglasDefault);
  const metas = useAppStore((s) => s.metas);
  const terrenos = useAppStore((s) => s.terrenos.terrenos);
  const ciudades = useCiudades().datos;
  const datos = useMemo(
    () =>
      base.datos && ciudades
        ? plazasConTerrenos(base.datos, terrenos, ciudades).map((p) =>
            aplicarMeta(aplicarReglaDefault(p, reglas), metas),
          )
        : undefined,
    [base.datos, ciudades, terrenos, reglas, metas],
  );
  return { datos, cargando: base.cargando };
}

export function usePlaza(id: string) {
  const base = useConsulta((r) => r.plazas.obtenerPlaza(id), [id]);
  const reglas = useAppStore((s) => s.reglasDefault);
  const metas = useAppStore((s) => s.metas);
  const datos = useMemo<Plaza | undefined>(
    () =>
      base.datos
        ? aplicarMeta(aplicarReglaDefault(base.datos, reglas), metas)
        : undefined,
    [base.datos, reglas, metas],
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
  const terrenos = useAppStore((s) => s.terrenos.terrenos);
  const obra = useAppStore((s) => s.obra);
  const datos = useMemo(
    () =>
      terrenos.map((t) =>
        aplicarResumenObra(
          t,
          resumenObra(
            obra.contratos.filter((c) => c.terrenoId === t.id),
            obra.cortes,
            obra.pagos,
            DEMO_TODAY,
          ),
        ),
      ),
    [terrenos, obra],
  );
  return { datos, cargando: false };
}

/** Contratos de obra de un proyecto (parten del seed). */
export function useContratosObra(terrenoId: string) {
  const todos = useAppStore((s) => s.obra.contratos);
  return useMemo(
    () => todos.filter((c) => c.terrenoId === terrenoId),
    [todos, terrenoId],
  );
}

/** Cortes semanales de un proyecto, del más reciente al más antiguo. */
export function useCortesObra(terrenoId: string) {
  const contratos = useContratosObra(terrenoId);
  const todos = useAppStore((s) => s.obra.cortes);
  return useMemo(() => {
    const ids = new Set(contratos.map((c) => c.id));
    return todos
      .filter((c) => ids.has(c.contratoObraId))
      .toSorted((a, b) => b.semana.localeCompare(a.semana) || b.id.localeCompare(a.id));
  }, [contratos, todos]);
}

/** Pagos a contratistas de un proyecto (costo real, importado de EnKontrol de forma simulada). */
export function usePagosObra(terrenoId: string) {
  const contratos = useContratosObra(terrenoId);
  const todos = useAppStore((s) => s.obra.pagos);
  return useMemo(() => {
    const ids = new Set(contratos.map((c) => c.id));
    return todos.filter((p) => ids.has(p.contratoObraId));
  }, [contratos, todos]);
}

/** Licitaciones de obra de un proyecto (parten del seed). */
export function useLicitaciones(terrenoId: string) {
  const todas = useAppStore((s) => s.obra.licitaciones);
  return useMemo(
    () => todas.filter((l) => l.terrenoId === terrenoId),
    [todas, terrenoId],
  );
}

/** Cronograma de un proyecto, ordenado por inicio planeado. */
export function useCronograma(terrenoId: string) {
  const todas = useAppStore((s) => s.obra.cronograma);
  return useMemo(
    () =>
      todas
        .filter((a) => a.terrenoId === terrenoId)
        .toSorted((a, b) => a.inicioPlan.localeCompare(b.inicioPlan)),
    [todas, terrenoId],
  );
}

/** Filtro de ubicación de los mantenimientos: toda la red, una plaza o un local. */
export interface FiltroMantenimientos {
  plazaId?: string;
  localId?: string;
}

/** Mantenimientos de la demo (parten del seed), acotados a una plaza o a un local. */
export function useMantenimientos(filtro: FiltroMantenimientos = {}) {
  const todos = useAppStore((s) => s.mantenimientos.mantenimientos);
  const { plazaId, localId } = filtro;
  const datos = useMemo(
    () => filtrarPorUbicacion(todos, { plazaId, localId }),
    [todos, plazaId, localId],
  );
  return { datos, cargando: false };
}

export function useProveedores() {
  return useConsulta((r) => r.mantenimientos.listarProveedores());
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
