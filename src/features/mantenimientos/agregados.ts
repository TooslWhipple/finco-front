import type {
  CargoMantenimiento,
  EstatusMantenimiento,
  Mantenimiento,
  TipoMantenimiento,
} from "@/domain";

export const TODOS = "TODOS";

export interface FiltroMantenimientosVista {
  /** Id de plaza, o `TODOS`. */
  plazaId: string;
  tipo: typeof TODOS | TipoMantenimiento;
  cargo: typeof TODOS | CargoMantenimiento;
  /** Texto libre; se busca en el folio, el título, el proveedor y el local. */
  texto: string;
}

export const FILTRO_INICIAL: FiltroMantenimientosVista = {
  plazaId: TODOS,
  tipo: TODOS,
  cargo: TODOS,
  texto: "",
};

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Filtra la lista. `buscable` devuelve todo el texto en que se busca un
 * mantenimiento (la pantalla conoce los nombres de proveedor y local).
 */
export function filtrarMantenimientos(
  lista: readonly Mantenimiento[],
  filtro: FiltroMantenimientosVista,
  buscable: (m: Mantenimiento) => string,
): Mantenimiento[] {
  const texto = normalizar(filtro.texto);
  return lista.filter(
    (m) =>
      (filtro.plazaId === TODOS || m.plazaId === filtro.plazaId) &&
      (filtro.tipo === TODOS || m.tipo === filtro.tipo) &&
      (filtro.cargo === TODOS || m.cargoA === filtro.cargo) &&
      (texto === "" || normalizar(buscable(m)).includes(texto)),
  );
}

/**
 * Los de un estatus. Los abiertos van por fecha programada ascendente (lo más
 * urgente arriba); los cerrados, del más reciente al más antiguo.
 */
export function mantenimientosDeEstatus(
  lista: readonly Mantenimiento[],
  estatus: EstatusMantenimiento,
): Mantenimiento[] {
  const abiertos = estatus === "PROGRAMADO" || estatus === "EN_PROCESO";
  const fecha = (m: Mantenimiento) => m.fechaFin ?? m.fechaInicio ?? m.fechaProgramada;
  return lista
    .filter((m) => m.estatus === estatus)
    .sort((a, b) =>
      abiertos
        ? a.fechaProgramada.localeCompare(b.fechaProgramada)
        : fecha(b).localeCompare(fecha(a)),
    );
}
