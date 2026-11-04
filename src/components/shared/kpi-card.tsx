import { Children, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type TonoKpi = "neutro" | "positivo" | "alerta" | "peligro";

const TONO_SUB: Record<TonoKpi, string> = {
  neutro: "text-brand-text-muted",
  positivo: "text-brand-secondary",
  alerta: "text-brand-cta",
  peligro: "text-brand-danger",
};

/** Variación del KPI: flecha ▲/▼ + texto ("+3.2% vs. oct"). */
export interface DeltaKpi {
  texto: ReactNode;
  direccion: "sube" | "baja";
  /** Color del delta; por omisión positivo si sube y peligro si baja. */
  tono?: TonoKpi;
}

interface KpiCardProps {
  etiqueta: string;
  valor: ReactNode;
  /** Variación con flecha bajo la cifra. */
  delta?: DeltaKpi;
  /** Sub-texto gris bajo la cifra (o bajo el delta). */
  subtexto?: ReactNode;
  /** Línea de apoyo coloreada según `tono`. */
  detalle?: ReactNode;
  tono?: TonoKpi;
  className?: string;
}

export function KpiCard({
  etiqueta,
  valor,
  delta,
  subtexto,
  detalle,
  tono = "neutro",
  className,
}: KpiCardProps) {
  const tonoDelta = delta?.tono ?? (delta?.direccion === "baja" ? "peligro" : "positivo");
  const IconoDelta = delta?.direccion === "baja" ? ArrowDown : ArrowUp;
  return (
    <div
      className={cn(
        "rounded-xl border border-brand-line bg-card px-4 py-3.5 shadow-xs",
        className,
      )}
    >
      <p className="text-sm text-brand-text-muted">{etiqueta}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-brand-primary">{valor}</p>
      {delta ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            TONO_SUB[tonoDelta],
          )}
        >
          <IconoDelta aria-hidden className="size-3 shrink-0" />
          {delta.texto}
        </p>
      ) : null}
      {subtexto ? (
        <p className="mt-0.5 text-xs text-brand-text-muted">{subtexto}</p>
      ) : null}
      {detalle ? <p className={cn("mt-1 text-sm", TONO_SUB[tono])}>{detalle}</p> : null}
    </div>
  );
}

/**
 * Fila de KPIs. A ≥1280 px (xl) todas las tarjetas van en una sola fila, sean 3,
 * 5 o 6; por debajo se reparten en columnas que envuelven.
 */
export function KpiRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const cuantos = Children.toArray(children).length;
  return (
    <div
      className={cn(
        "grid [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))] gap-3 xl:[grid-template-columns:repeat(var(--kpi-n),minmax(0,1fr))]",
        className,
      )}
      style={{ "--kpi-n": cuantos } as CSSProperties}
    >
      {children}
    </div>
  );
}
