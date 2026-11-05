"use client";

import { useMemo } from "react";
import type { Local, Mantenimiento, Plaza, Proveedor } from "@/domain";
import { useLocales, usePlazas, useProveedores } from "@/hooks";

/** Nombres que las pantallas de mantenimientos resuelven a partir de los ids. */
export interface ContextoMantenimiento {
  plazas: readonly Plaza[];
  locales: readonly Local[];
  proveedores: readonly Proveedor[];
  nombrePlaza(plazaId: string): string;
  local(localId: string | undefined): Local | undefined;
  proveedor(proveedorId: string): Proveedor | undefined;
  /** Texto en que busca el filtro: folio, título, proveedor, plaza y local. */
  buscable(m: Mantenimiento): string;
}

const SIN_DATOS: never[] = [];

/** Catálogos de plazas, locales (de una plaza o de toda la red) y proveedores. */
export function useContextoMantenimiento(plazaId?: string): ContextoMantenimiento {
  const plazas = usePlazas().datos ?? SIN_DATOS;
  const locales = useLocales(plazaId).datos ?? SIN_DATOS;
  const proveedores = useProveedores().datos ?? SIN_DATOS;
  return useMemo(() => {
    const plazaPorId = new Map(plazas.map((p) => [p.id, p]));
    const localPorId = new Map(locales.map((l) => [l.id, l]));
    const proveedorPorId = new Map(proveedores.map((p) => [p.id, p]));
    const nombrePlaza = (id: string) => plazaPorId.get(id)?.nombre ?? id;
    const local = (id: string | undefined) => (id ? localPorId.get(id) : undefined);
    const proveedor = (id: string) => proveedorPorId.get(id);
    return {
      plazas,
      locales,
      proveedores,
      nombrePlaza,
      local,
      proveedor,
      buscable: (m) =>
        [
          m.folio,
          m.titulo,
          proveedor(m.proveedorId)?.nombre,
          nombrePlaza(m.plazaId),
          local(m.localId)?.codigo,
        ]
          .filter(Boolean)
          .join(" "),
    };
  }, [plazas, locales, proveedores]);
}
