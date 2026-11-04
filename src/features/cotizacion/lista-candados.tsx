import { Check, ShieldCheck, X } from "lucide-react";
import type { Candado } from "@/domain";
import { cn } from "@/lib/utils";

const ICONO = {
  CUMPLE: { Icono: Check, clase: "bg-brand-secondary/15 text-brand-secondary" },
  EXCEPCION: { Icono: ShieldCheck, clase: "bg-brand-cta/15 text-brand-cta" },
  FALLA: { Icono: X, clase: "bg-brand-coral/15 text-brand-coral" },
} as const;

/** Los 5 candados con su resultado; el detalle del precio se enriquece desde fuera. */
export function ListaCandados({
  candados,
  detalles,
}: {
  candados: readonly Candado[];
  /** Sustituye el detalle estándar de un candado (p. ej. renta vs mínimo). */
  detalles?: Partial<Record<Candado["id"], string>>;
}) {
  return (
    <ul className="divide-y divide-brand-line">
      {candados.map((c) => {
        const { Icono, clase } = ICONO[c.estado];
        return (
          <li key={c.id} className="flex items-start gap-3 py-3">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                clase,
              )}
            >
              <Icono aria-hidden className="size-3.5" />
              <span className="sr-only">{ESTADO_TEXTO[c.estado]}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-text">{c.nombre}</p>
              <p className="text-xs text-brand-text-muted">
                {detalles?.[c.id] ?? c.detalle}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const ESTADO_TEXTO = {
  CUMPLE: "Cumple",
  EXCEPCION: "Excepción aprobada",
  FALLA: "No cumple",
} as const;
