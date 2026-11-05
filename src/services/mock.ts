import {
  DEMO_TODAY,
  estatusCobro,
  HORAS_APARTADO,
  INPC_ANUAL,
  UMBRAL_ALTA,
  UMBRAL_MEDIA,
} from "@/domain";
import { USUARIOS_DEMO } from "@/config/usuarios";
import { crearSeed, type Seed } from "@/data/seed";
import type {
  CobranzaRepository,
  ConfiguracionRepository,
  ContratosRepository,
  CotizacionesRepository,
  EstadoIntegracion,
  IntegracionesService,
  LocalesRepository,
  MantenimientosRepository,
  PlazasRepository,
  ProspectosRepository,
  Repositorios,
  TerrenosRepository,
} from "./tipos";

/** Lecturas sobre el seed: copias superficiales para que la UI no mute la fuente. */
function crearPlazasMock(seed: Seed): PlazasRepository {
  return {
    listarCiudades: async () => [...seed.ciudades],
    listarPlazas: async () => [...seed.plazas],
    obtenerPlaza: async (id) => seed.plazas.find((p) => p.id === id),
    listarPlantas: async (plazaId) => seed.plantas.filter((p) => p.plazaId === plazaId),
  };
}

function crearLocalesMock(seed: Seed): LocalesRepository {
  return {
    listar: async () => [...seed.locales],
    listarPorPlaza: async (plazaId) => seed.locales.filter((l) => l.plazaId === plazaId),
    obtener: async (id) => seed.locales.find((l) => l.id === id),
    listarLocatarios: async () => [...seed.locatarios],
    obtenerLocatario: async (id) => seed.locatarios.find((l) => l.id === id),
    listarContratos: async () => [...seed.contratos],
    contratoVigenteDe: async (localId) =>
      seed.contratos.find(
        (c) => c.localId === localId && c.inicio <= DEMO_TODAY && c.fin >= DEMO_TODAY,
      ),
    listarCambiosPropuestos: async (año) =>
      seed.cambiosPropuestos.filter((c) => c.año === año),
  };
}

function crearCotizacionesMock(seed: Seed): CotizacionesRepository {
  return {
    listar: async () => [...seed.cotizaciones],
    obtener: async (id) => seed.cotizaciones.find((c) => c.id === id),
    listarPorLocal: async (localId) =>
      seed.cotizaciones.filter((c) => c.localId === localId),
    listarExcepciones: async () => [...seed.excepciones],
    siguienteFolio: async () => {
      const numeros = seed.cotizaciones.map((c) => Number(c.id.split("-")[2]));
      return `COT-${DEMO_TODAY.slice(0, 4)}-${String(Math.max(...numeros) + 1).padStart(4, "0")}`;
    },
  };
}

function crearCobranzaMock(seed: Seed): CobranzaRepository {
  return {
    listarCorte: async (mes) => {
      if (!seed.facturas.some((f) => f.mes === mes)) return [];
      return seed.facturas.filter(
        (f) =>
          f.mes === mes || (f.mes < mes && estatusCobro(f, DEMO_TODAY) === "VENCIDA"),
      );
    },
    obtener: async (id) => seed.facturas.find((f) => f.id === id),
  };
}

function crearProspectosMock(seed: Seed): ProspectosRepository {
  return { listar: async () => [...seed.prospectos] };
}

function crearContratosMock(seed: Seed): ContratosRepository {
  return { listar: async () => [...seed.contratos] };
}

function crearTerrenosMock(seed: Seed): TerrenosRepository {
  return { listar: async () => [...seed.terrenos] };
}

function crearMantenimientosMock(seed: Seed): MantenimientosRepository {
  return {
    listar: async () => [...seed.mantenimientos],
    listarProveedores: async () => [...seed.proveedores],
  };
}

function crearConfiguracionMock(seed: Seed): ConfiguracionRepository {
  return {
    listarUsuarios: async () => [...USUARIOS_DEMO],
    reglasDefault: async () =>
      Object.fromEntries(
        seed.plazas.flatMap((p) => (p.reglaDefault ? [[p.id, p.reglaDefault]] : [])),
      ),
    obtenerParametros: async () => ({
      inpcAnual: INPC_ANUAL,
      horasApartado: HORAS_APARTADO,
      umbralOcupacionAlta: UMBRAL_ALTA,
      umbralOcupacionMedia: UMBRAL_MEDIA,
    }),
  };
}

function crearIntegracionesMock(seed: Seed): IntegracionesService {
  const pagadas = seed.facturas.filter((f) => f.pagadaEl).length;
  const estado = (ultimoSync: string): EstadoIntegracion => ({
    ultimoSync,
    facturasTimbradas: seed.facturas.length,
    facturasTotales: seed.facturas.length,
    pagosAplicados: pagadas,
    polizasGeneradas: pagadas,
    diferencias: seed.diferenciasEnKontrol,
    conciliacion:
      pagadas === 0 ? 1 : (pagadas - seed.diferenciasEnKontrol.length) / pagadas,
  });
  return {
    listar: async () => seed.integraciones.map((i) => ({ ...i })),
    listarEventos: async () => [...seed.eventosSync],
    obtenerEstado: async () => estado(seed.ultimoSync),
    sincronizar: async (ahora) => estado(ahora),
  };
}

/** Repositorios en memoria sobre un seed (el de la demo por defecto). */
export function crearRepositoriosMock(seed: Seed = crearSeed()): Repositorios {
  return {
    plazas: crearPlazasMock(seed),
    locales: crearLocalesMock(seed),
    cotizaciones: crearCotizacionesMock(seed),
    cobranza: crearCobranzaMock(seed),
    prospectos: crearProspectosMock(seed),
    contratos: crearContratosMock(seed),
    terrenos: crearTerrenosMock(seed),
    mantenimientos: crearMantenimientosMock(seed),
    integraciones: crearIntegracionesMock(seed),
    configuracion: crearConfiguracionMock(seed),
  };
}
