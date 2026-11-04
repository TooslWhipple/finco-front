"use client";

import { cn } from "@/lib/utils";

export interface OpcionSegmento<T extends string> {
  valor: T;
  etiqueta: string;
}

interface SegmentedControlProps<T extends string> {
  opciones: readonly OpcionSegmento<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Nombre accesible del grupo. */
  etiqueta: string;
  className?: string;
  /** `solido`: activa en color primario. `suave`: activa blanca sobre fondo crema (editores). */
  variante?: "solido" | "suave";
}

export function SegmentedControl<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
  className,
  variante = "solido",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={cn(
        "inline-flex gap-1 rounded-lg border border-brand-line p-1",
        variante === "suave" ? "bg-brand-cream" : "bg-card",
        className,
      )}
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
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              activa
                ? variante === "suave"
                  ? "bg-card text-brand-text shadow-xs ring-1 ring-brand-line"
                  : "bg-brand-primary text-white"
                : variante === "suave"
                  ? "text-brand-text-muted hover:text-brand-text"
                  : "text-brand-text hover:bg-brand-cream",
            )}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
