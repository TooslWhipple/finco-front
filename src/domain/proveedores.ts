import { montoMantenimiento, proveedorAtiende } from "./mantenimientos";
import { montoContrato } from "./obra";
import type {
  CategoriaMantenimiento,
  ContratoObra,
  Licitacion,
  Mantenimiento,
  PartidaObra,
  Proveedor,
} from "./tipos";

/** Partidas de obra en el orden del presupuesto (el de `ETIQUETA_PARTIDA`). */
export const PARTIDAS_OBRA: readonly PartidaObra[] = [
  "TERRACERIAS",
  "CIMENTACION",
  "ESTRUCTURA",
  "MUROS",
  "INST_HIDRAULICAS",
  "INST_ELECTRICAS",
  "TECHOS",
  "ACABADOS",
];

/**
 * RFC normalizado para comparar y guardar (sin espacios y en mayúsculas). Lo
 * comparten el guard del reducer (`rfcEnUso`) y el esquema del formulario.
 */
export function normalizarRfc(rfc: string): string {
  return rfc.trim().toUpperCase();
}

/** ¿Algún proveedor del padrón, distinto de `exceptoId`, ya usa ese RFC? */
export function rfcEnUso(
  padron: readonly Pick<Proveedor, "id" | "rfc">[],
  rfc: string,
  exceptoId?: string,
): boolean {
  const buscado = normalizarRfc(rfc);
  return padron.some((p) => p.id !== exceptoId && normalizarRfc(p.rfc) === buscado);
}

/** Activos que atienden la categoría en la plaza: los que se ofrecen al dar de alta un trabajo. */
export function proveedoresDeMantenimiento(
  proveedores: readonly Proveedor[],
  categoria: CategoriaMantenimiento,
  plazaId: string,
): Proveedor[] {
  return proveedores.filter(
    (p) => p.activo && p.plazaIds.includes(plazaId) && proveedorAtiende(p, categoria),
  );
}

/** Activos que trabajan la partida de obra: los candidatos a invitar a una licitación. */
export function proveedoresDePartida(
  padron: Proveedor[],
  partida: PartidaObra,
): Proveedor[] {
  return padron.filter((p) => p.activo && p.partidasObra.includes(partida));
}

/** Id (`prv-N`) del siguiente proveedor: continúa tras el mayor `prv-N` existente. */
export function siguienteIdProveedor(
  proveedores: readonly Pick<Proveedor, "id">[],
): string {
  const mayor = proveedores.reduce((max, p) => {
    const numero = Number(p.id.replace(/^prv-/, ""));
    return Number.isInteger(numero) ? Math.max(max, numero) : max;
  }, 0);
  return `prv-${mayor + 1}`;
}

/** Monto acumulado bajo una clave (plaza o categoría). */
export interface MontoPor<K extends string> {
  clave: K;
  monto: number;
}

export interface ContratoDeProveedor {
  contrato: ContratoObra;
  /** Monto contratado (suma de sus conceptos). */
  monto: number;
}

export interface LicitacionDeProveedor {
  licitacion: Licitacion;
  invitado: boolean;
  ganador: boolean;
}

export interface HistorialProveedor {
  /** Todos sus trabajos de mantenimiento, en cualquier estatus. */
  trabajos: Mantenimiento[];
  /** Lo cobrado: suma de `montoMantenimiento` de los FINALIZADO. */
  cobrado: number;
  /** Número de trabajos cobrados (los FINALIZADO que suma `cobrado`). */
  finalizados: number;
  /** Lo cobrado por plaza, de mayor a menor. */
  cobradoPorPlaza: MontoPor<string>[];
  /** Lo cobrado por categoría, de mayor a menor. */
  cobradoPorCategoria: MontoPor<CategoriaMantenimiento>[];
  /** Contratos de obra que ejecuta, con su monto contratado (aparte de lo cobrado). */
  contratos: ContratoDeProveedor[];
  /** Licitaciones a las que fue invitado o que ganó. */
  licitaciones: LicitacionDeProveedor[];
}

function acumular<K extends string>(
  trabajos: readonly Mantenimiento[],
  clave: (m: Mantenimiento) => K,
): MontoPor<K>[] {
  const porClave = new Map<K, number>();
  for (const m of trabajos) {
    const k = clave(m);
    porClave.set(k, (porClave.get(k) ?? 0) + montoMantenimiento(m));
  }
  return [...porClave]
    .map(([k, monto]) => ({ clave: k, monto }))
    .sort((a, b) => b.monto - a.monto);
}

/** Historial del proveedor en mantenimiento y en obra, con lo cobrado por plaza y categoría. */
export function historialProveedor(
  proveedorId: string,
  mantenimientos: readonly Mantenimiento[],
  contratos: readonly ContratoObra[],
  licitaciones: readonly Licitacion[],
): HistorialProveedor {
  const trabajos = mantenimientos.filter((m) => m.proveedorId === proveedorId);
  const finalizados = trabajos.filter((m) => m.estatus === "FINALIZADO");
  return {
    trabajos,
    cobrado: finalizados.reduce((suma, m) => suma + montoMantenimiento(m), 0),
    finalizados: finalizados.length,
    cobradoPorPlaza: acumular(finalizados, (m) => m.plazaId),
    cobradoPorCategoria: acumular(finalizados, (m) => m.categoria),
    contratos: contratos
      .filter((c) => c.proveedorId === proveedorId)
      .map((contrato) => ({ contrato, monto: montoContrato(contrato) })),
    licitaciones: licitaciones.flatMap((licitacion) => {
      const invitado = licitacion.invitados.includes(proveedorId);
      const ganador = licitacion.ganadorId === proveedorId;
      return invitado || ganador ? [{ licitacion, invitado, ganador }] : [];
    }),
  };
}
