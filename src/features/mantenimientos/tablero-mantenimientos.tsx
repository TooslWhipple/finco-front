"use client";

import { useMemo } from "react";
import { StatusChip, TableroKanban } from "@/components/shared";
import {
  DEMO_TODAY,
  estaAtrasado,
  ESTATUS_MANTENIMIENTO,
  ETIQUETA_ESTATUS_MANTENIMIENTO,
  type EstatusMantenimiento,
  type Mantenimiento,
} from "@/domain";
import { formatFecha, formatMoneda, formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { mantenimientosDeEstatus } from "./agregados";
import type { ContextoMantenimiento } from "./contexto";

/** Las columnas ya cerradas se acotan a lo más reciente para no alargar el tablero. */
const TOPE_CERRADOS = 15;
const CERRADOS: readonly EstatusMantenimiento[] = ["FINALIZADO", "CANCELADO"];

interface TableroMantenimientosProps {
  mantenimientos: readonly Mantenimiento[];
  contexto: ContextoMantenimiento;
  seleccionadoId?: string;
  onSeleccionar: (m: Mantenimiento) => void;
}

/** Tablero con una columna por estatus. */
export function TableroMantenimientos({
  mantenimientos,
  contexto,
  seleccionadoId,
  onSeleccionar,
}: TableroMantenimientosProps) {
  const columnas = useMemo(
    () =>
      ESTATUS_MANTENIMIENTO.map((estatus) => {
        const todos = mantenimientosDeEstatus(mantenimientos, estatus);
        const recortada = CERRADOS.includes(estatus) && todos.length > TOPE_CERRADOS;
        return {
          id: estatus,
          titulo: recortada
            ? `${ETIQUETA_ESTATUS_MANTENIMIENTO[estatus]} (${TOPE_CERRADOS} de ${formatNumero(todos.length)})`
            : ETIQUETA_ESTATUS_MANTENIMIENTO[estatus],
          items: recortada ? todos.slice(0, TOPE_CERRADOS) : todos,
        };
      }),
    [mantenimientos],
  );

  return (
    <TableroKanban
      etiqueta="Mantenimientos por estatus"
      columnas={columnas}
      clave={(m) => m.id}
      vacio="Sin mantenimientos"
      renderTarjeta={(m) => {
        const ubicacion = [
          contexto.nombrePlaza(m.plazaId),
          contexto.local(m.localId)?.codigo,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <button
            type="button"
            onClick={() => onSeleccionar(m)}
            className={cn(
              "w-full space-y-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-colors outline-none hover:border-brand-primary focus-visible:ring-3 focus-visible:ring-ring/50",
              m.id === seleccionadoId ? "border-brand-primary" : "border-brand-line",
            )}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-brand-text-muted">{m.folio}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {estaAtrasado(m, DEMO_TODAY) ? <StatusChip estatus="ATRASADO" /> : null}
                <StatusChip estatus={m.tipo} />
              </span>
            </span>
            <span className="block font-medium text-brand-primary">{m.titulo}</span>
            <span className="block text-xs text-brand-text-muted">{ubicacion}</span>
            <span className="flex justify-between gap-2 text-xs text-brand-text-muted">
              <span>
                {m.fechaFin
                  ? formatFecha(m.fechaFin)
                  : m.fechaInicio
                    ? formatFecha(m.fechaInicio)
                    : `Prog. ${formatFecha(m.fechaProgramada)}`}
              </span>
              <span className="tabular-nums">
                {formatMoneda(m.costoReal ?? m.costoEstimado)}
              </span>
            </span>
          </button>
        );
      }}
    />
  );
}
