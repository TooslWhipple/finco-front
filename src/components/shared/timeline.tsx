import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TonoChip } from "./status-chip";

export interface EventoTimeline {
  id: string;
  titulo: ReactNode;
  detalle?: ReactNode;
  /** Fecha u hora ya formateada. */
  fecha?: string;
  tono?: TonoChip;
}

const PUNTO: Record<TonoChip, string> = {
  verde: "bg-brand-secondary",
  naranja: "bg-brand-cta",
  coral: "bg-brand-coral",
  indigo: "bg-brand-indigo",
  primario: "bg-brand-primary",
  neutro: "bg-brand-text-muted",
};

export function Timeline({
  eventos,
  className,
}: {
  eventos: readonly EventoTimeline[];
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-4 border-l border-brand-line pl-5", className)}>
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-card",
              PUNTO[e.tono ?? "primario"],
            )}
          />
          <p className="text-sm font-medium text-brand-text">{e.titulo}</p>
          {e.detalle ? (
            <p className="text-sm text-brand-text-muted">{e.detalle}</p>
          ) : null}
          {e.fecha ? (
            <p className="mt-0.5 text-xs text-brand-text-muted">{e.fecha}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
