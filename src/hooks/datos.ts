"use client";

import { useMemo } from "react";
import {
  aplicarResumenObra,
  DEMO_TODAY,
  facturasDelCorte,
  filtrarPorUbicacion,
  foliosFacturaDeLocal,
  mesesFoliosFactura,
  mezclarFacturas,
  filtrarPorVendedor,
  licitacionesDeProveedor,
  resumenObra,
  type AtribucionContratos,
  type Comision,
  type Contrato,
  type EventoSync,
  type Factura,
  type FolioFactura,
  type FuentesLocatario,
  type Integracion,
  type Local,
  type Plaza,
} from "@/domain";
import { plazasConTerrenos } from "@/data/terrenos";
import { can, veTodoElEquipo } from "@/config/permissions";
import { usuarioPorId } from "@/config/usuarios";
import { useAppStore } from "@/store";
import { useSesionStore } from "@/store/sesion";
import {
  aplicarAjuste,
  aplicarAperturas,
  aplicarMeta,
  aplicarReglaDefault,
  aplicarReglaHeredada,
  aplicarTerminaciones,
} from "@/store/reducers";
import type { EstadoIntegracion } from "@/services";
import { useConsulta } from "./use-consulta";

/**
 * Usuario y rol que ve la pantalla (nulos sin sesión), si la cuenta puede
 * suplantar y el usuario de la cuenta que se autenticó.
 */
export function useSesion() {
  const usuarioId = useSesionStore((s) => s.usuarioId);
  const cuentaUsuarioId = useSesionStore((s) => s.cuentaUsuarioId);
  const puedeSuplantar = useSesionStore((s) => s.puedeSuplantar);
  const usuario = usuarioPorId(usuarioId);
  return { usuario, rol: usuario?.rol ?? null, puedeSuplantar, cuentaUsuarioId };
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

/** Contratos del repositorio con las terminaciones y aperturas hechas en la demo. */
export function useContratos() {
  const base = useConsulta((r) => r.locales.listarContratos());
  const terminaciones = useAppStore((s) => s.contratos.terminaciones);
  const aperturas = useAppStore((s) => s.contratos.aperturas);
  const datos = useMemo(
    () =>
      base.datos &&
      aplicarAperturas(aplicarTerminaciones(base.datos, terminaciones), aperturas),
    [base.datos, terminaciones, aperturas],
  );
  return { datos, cargando: base.cargando };
}

export function useContratoVigente(localId: string) {
  return useConsulta((r) => r.locales.contratoVigenteDe(localId), [localId]);
}

/** Cotizaciones de todo el equipo, sin filtrar: para vistas que no son del vendedor (contratos). */
export function useTodasLasCotizaciones() {
  return useAppStore((s) => s.cotizaciones.cotizaciones);
}

/** Cotizaciones vivas visibles para la sesión: cada vendedor ve solo las suyas. */
export function useCotizaciones() {
  const todas = useTodasLasCotizaciones();
  const { usuario } = useSesion();
  return useMemo(
    () => (usuario ? filtrarPorVendedor(todas, usuario) : todas),
    [todas, usuario],
  );
}

export function useCotizacion(id: string) {
  const cotizaciones = useCotizaciones();
  return useMemo(() => cotizaciones.find((c) => c.id === id), [cotizaciones, id]);
}

/** Prospectos del embudo comercial: viven en el store (parten del seed). */
export function useProspectos() {
  const todos = useAppStore((s) => s.prospectos.prospectos);
  const { usuario } = useSesion();
  const datos = useMemo(
    () => (usuario ? filtrarPorVendedor(todos, usuario) : todos),
    [todos, usuario],
  );
  return { datos, cargando: false };
}

/**
 * Las tres fuentes de las que `nombreLocatario` resuelve el nombre de un
 * `locatarioId`: locatarios del repositorio, prospectos y cotizaciones de todo el
 * equipo. No se filtran por vendedor: el nombre de quien firma o paga un contrato
 * no depende de quién mire (Cobranza no ve las cotizaciones de Ventas).
 */
export function useFuentesLocatario(): FuentesLocatario {
  const { datos: locatarios } = useLocatarios();
  const prospectos = useAppStore((s) => s.prospectos.prospectos);
  const cotizaciones = useTodasLasCotizaciones();
  return useMemo(
    () => ({ locatarios: locatarios ?? [], prospectos, cotizaciones }),
    [locatarios, prospectos, cotizaciones],
  );
}

/**
 * Contratos del seed más los que nacieron de cotizaciones en la demo (en cualquier
 * estado), con las terminaciones y aperturas hechas en la demo.
 */
export function useContratosVivos() {
  const base = useConsulta((r) => r.contratos.listar());
  const nuevos = useAppStore((s) => s.contratos.nuevos);
  const terminaciones = useAppStore((s) => s.contratos.terminaciones);
  const aperturas = useAppStore((s) => s.contratos.aperturas);
  const datos = useMemo<Contrato[] | undefined>(
    () =>
      base.datos &&
      aplicarAperturas(
        aplicarTerminaciones([...base.datos, ...nuevos], terminaciones),
        aperturas,
      ),
    [base.datos, nuevos, terminaciones, aperturas],
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

/** Contratos de obra de todos los proyectos (la ficha del proveedor los cruza por `proveedorId`). */
export function useTodosLosContratosObra() {
  return useAppStore((s) => s.obra.contratos);
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

/** Estimaciones de pago de un proyecto, de la más reciente a la más antigua. */
export function useEstimacionesObra(terrenoId: string) {
  const contratos = useContratosObra(terrenoId);
  const todas = useAppStore((s) => s.obra.estimaciones);
  return useMemo(() => {
    const ids = new Set(contratos.map((c) => c.id));
    return todas
      .filter((e) => ids.has(e.contratoObraId))
      .toSorted(
        (a, b) =>
          b.registradaEn.localeCompare(a.registradaEn) || b.id.localeCompare(a.id),
      );
  }, [contratos, todas]);
}

/** Licitaciones de todos los proyectos (la ficha del proveedor las cruza por invitado y ganador). */
export function useTodasLasLicitaciones() {
  return useAppStore((s) => s.obra.licitaciones);
}

/** Licitaciones en curso a las que invitaron al proveedor del contratista (su portal). */
export function useMisLicitaciones(proveedorId: string | undefined) {
  const todas = useTodasLasLicitaciones();
  return useMemo(
    () => (proveedorId ? licitacionesDeProveedor(todas, proveedorId) : []),
    [todas, proveedorId],
  );
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

/** Presupuestos anuales de mantenimiento por plaza (parten del seed, editables en la demo). */
export function usePresupuestosMantenimiento() {
  return useAppStore((s) => s.mantenimientos.presupuestos);
}

/** CFDI recibidos simulados, ligados y libres. */
export function useFacturasSat() {
  return useAppStore((s) => s.mantenimientos.facturasSat);
}

/** Padrón único de proveedores (mantenimiento y obra; parte del seed, editable en la demo). */
export function useProveedores() {
  return useAppStore((s) => s.proveedores.padron);
}

/** Catálogo de campañas comerciales (parte del seed, editable en la demo). */
export function useCampanas() {
  return useAppStore((s) => s.campanas.campanas);
}

/** Casos de servicio a clientes (parte del seed, editables en la demo). */
export function useCasos() {
  return useAppStore((s) => s.casos.casos);
}

/**
 * Comisiones visibles para la sesión: quien ve todo el equipo ve todas; el
 * resto, solo las que cobra. Sin sesión no hay ninguna.
 */
export function useComisiones(): Comision[] {
  const todas = useAppStore((s) => s.comisiones.comisiones);
  const { usuario } = useSesion();
  return useMemo(() => {
    if (!usuario) return [];
    if (veTodoElEquipo(usuario.rol)) return todas;
    return todas.filter((c) => c.usuarioId === usuario.id);
  }, [todas, usuario]);
}

/** Esquema de comisiones vigente (el que aplicará a la próxima firma). */
export function useEsquemaComisiones() {
  return useAppStore((s) => s.comisiones.esquema);
}

const MESES_FOLIOS = mesesFoliosFactura(DEMO_TODAY);

/**
 * Folios (`id`, `folio` y `mes`, sin importes) de las facturas del local de
 * los tres últimos meses, para ligar una aclaración. No depende de
 * `cobranza.ver`: quien atiende al locatario ve el folio, nunca el monto. Los
 * cortes se deduplican porque el de un mes repite las rentas vencidas de
 * meses anteriores; las emitidas en la demo se suman sin recargos ni pagos
 * (no llevan folio o no cambian el folio).
 */
export function useFoliosFacturaLocal(localId: string): {
  datos: FolioFactura[] | undefined;
  cargando: boolean;
} {
  const cortes = useConsulta((r) =>
    Promise.all(MESES_FOLIOS.map((mes) => r.cobranza.listarCorte(mes))),
  );
  const emitidas = useAppStore((s) => s.cobranza.emitidas);
  const datos = useMemo<FolioFactura[] | undefined>(() => {
    if (!cortes.datos) return undefined;
    const unicas = [...new Map(cortes.datos.flat().map((f) => [f.id, f])).values()];
    return foliosFacturaDeLocal(
      mezclarFacturas(unicas, emitidas, [], {}),
      localId,
      DEMO_TODAY,
    );
  }, [cortes.datos, emitidas, localId]);
  return { datos, cargando: cortes.cargando };
}

/** Referencia estable mientras la atribución carga. */
const SIN_ATRIBUCION: AtribucionContratos = {};

/**
 * Atribución demo (vendedor y campaña) de los contratos históricos sin
 * cotización; dato de solo lectura del repositorio de contratos.
 */
export function useAtribucionContratos(): AtribucionContratos {
  return useConsulta((r) => r.contratos.atribucionContratos()).datos ?? SIN_ATRIBUCION;
}

export function useExcepciones() {
  return useAppStore((s) => s.aprobaciones.excepciones);
}

export function useCambiosAnuales() {
  return useAppStore((s) => s.aprobaciones.cambiosAnuales);
}

/** Resultado estable de `useFacturas` para quien no ve la cobranza. */
const SIN_FACTURAS: Factura[] = [];
const SIN_FACTURAS_CONSULTA = { datos: SIN_FACTURAS, cargando: false };

/**
 * Cuentas por cobrar del corte: la semilla más las facturas emitidas y los
 * recargos de la demo, con los pagos y el seguimiento registrados en la demo.
 * Sin `cobranza.ver` devuelve una lista vacía estable (los hooks se llaman
 * igual, para no cambiar su orden).
 */
export function useFacturas(mes: string): {
  datos: Factura[] | undefined;
  cargando: boolean;
} {
  const { rol } = useSesion();
  const base = useConsulta((r) => r.cobranza.listarCorte(mes), [mes]);
  const seguimientos = useAppStore((s) => s.cobranza.seguimientos);
  const emitidas = useAppStore((s) => s.cobranza.emitidas);
  const recargos = useAppStore((s) => s.cobranza.recargos);
  const pagos = useAppStore((s) => s.cobranza.pagos);
  const datos = useMemo<Factura[] | undefined>(
    () =>
      base.datos &&
      facturasDelCorte(
        mezclarFacturas(base.datos, emitidas, recargos, pagos),
        mes,
        DEMO_TODAY,
      ).map((f) => {
        const nuevos = seguimientos[f.id];
        if (!nuevos?.length) return f;
        const historial = [...(f.seguimiento ? [f.seguimiento] : []), ...nuevos];
        return { ...f, seguimiento: historial[historial.length - 1], historial };
      }),
    [base.datos, emitidas, recargos, pagos, mes, seguimientos],
  );
  if (!can(rol, "cobranza.ver")) return SIN_FACTURAS_CONSULTA;
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
