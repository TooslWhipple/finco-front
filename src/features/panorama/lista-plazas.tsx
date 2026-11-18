"use client";

import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { EmptyState, StatusChip } from "@/components/shared";
import { hrefPermitido } from "@/config/acceso-rutas";
import { rutaPlaza } from "@/domain";
import { useSesion } from "@/hooks";
import { formatNumero, formatPorcentaje } from "@/lib/format";
import type { ResumenPlaza } from "./agregados";

const CLASE_FILA = "flex items-center justify-between gap-4 px-5 py-3";

/**
 * Plazas del Panorama. Una plaza cuya ruta el rol no abre (la de una plaza en
 * preventa lleva a su terreno) se muestra sin enlace.
 */
export function ListaPlazas({ plazas }: { plazas: ResumenPlaza[] }) {
  const { rol } = useSesion();
  if (plazas.length === 0) {
    return (
      <EmptyState
        icono={MapPinOff}
        titulo="Sin plazas con estos filtros"
        descripcion="Quita un filtro para ver más plazas."
      />
    );
  }
  return (
    <ul className="max-h-[26rem] divide-y divide-brand-line overflow-y-auto">
      {plazas.map((p) => {
        const ruta = rutaPlaza(p.plaza.id);
        const contenido = (
          <>
            <div className="min-w-0">
              <p className="truncate font-medium text-brand-primary">{p.plaza.nombre}</p>
              <p className="text-sm text-brand-text-muted">
                {p.ciudad.nombre}, {p.ciudad.estado} · {formatNumero(p.totalLocales)}{" "}
                locales
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              {p.plaza.estatus === "PREVENTA" ? (
                <StatusChip estatus="PREVENTA" />
              ) : (
                <span className="text-brand-text">
                  {formatPorcentaje(p.ocupacion)} ocupada
                </span>
              )}
              <span className="text-brand-text-muted">
                {formatNumero(p.disponibles)} disp.
              </span>
            </div>
          </>
        );
        return (
          <li key={p.plaza.id}>
            {rol && hrefPermitido(rol, ruta) ? (
              <Link
                href={ruta}
                className={`${CLASE_FILA} transition-colors hover:bg-brand-cream`}
              >
                {contenido}
              </Link>
            ) : (
              <div className={CLASE_FILA}>{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
