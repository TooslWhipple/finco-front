"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Barra de filtros en una sola línea: pills a la izquierda y controles
 * (`SelectorPill`, botones) a la derecha. Nunca envuelve; si falta ancho, hace scroll.
 */
export function BarraFiltros({
  children,
  derecha,
  className,
  envolver = false,
}: {
  children: ReactNode;
  /** Controles alineados al extremo derecho (selector de plaza, búsqueda...). */
  derecha?: ReactNode;
  className?: string;
  /** Permite que los controles pasen a otra línea en vez de hacer scroll. */
  envolver?: boolean;
}) {
  const flujo = envolver ? "flex-wrap" : "flex-nowrap";
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        envolver ? "flex-wrap gap-y-2" : "flex-nowrap overflow-x-auto",
        className,
      )}
    >
      <div className={cn("flex items-center gap-2", flujo, envolver && "gap-y-2")}>
        {children}
      </div>
      {derecha ? (
        <div className={cn("ml-auto flex items-center gap-2", flujo)}>{derecha}</div>
      ) : null}
    </div>
  );
}

export interface OpcionPill<T extends string> {
  valor: T;
  etiqueta: string;
  /** Conteo mostrado entre paréntesis, ya calculado. */
  conteo?: number;
}

interface PillsFiltroProps<T extends string> {
  opciones: readonly OpcionPill<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Nombre accesible del grupo. */
  etiqueta: string;
  /** Las pills pasan a otra línea si no caben (columnas estrechas). */
  envolver?: boolean;
}

/** Grupo de pills de selección única (estilo "Todas · Con atraso · Vigentes"). */
export function PillsFiltro<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
  envolver = false,
}: PillsFiltroProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={cn("flex gap-2", envolver ? "flex-wrap" : "flex-nowrap")}
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onChange(o.valor)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-lg:h-11 pointer-coarse:h-11",
              activa
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-line bg-card text-brand-text hover:bg-brand-cream",
            )}
          >
            {o.etiqueta}
            {o.conteo !== undefined ? ` (${o.conteo.toLocaleString("es-MX")})` : ""}
          </button>
        );
      })}
    </div>
  );
}
