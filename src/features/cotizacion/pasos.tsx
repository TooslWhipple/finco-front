import { Check } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { PasoCotizacion } from "./calculos";

/** Stepper horizontal de 5 pasos con conectores; el estado viene derivado, no se navega. */
export function PasosCotizacion({ pasos }: { pasos: readonly PasoCotizacion[] }) {
  return (
    <ol className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-brand-line bg-card px-6 py-4 shadow-xs">
      {pasos.map((p, i) => (
        <Fragment key={p.numero}>
          {i > 0 ? (
            <li
              aria-hidden
              className={cn(
                "h-0.5 min-w-4 flex-1 rounded-full",
                pasos[i - 1].estado === "HECHO" ? "bg-brand-secondary" : "bg-brand-line",
              )}
            />
          ) : null}
          <li
            aria-current={p.estado === "ACTUAL" ? "step" : undefined}
            className="flex shrink-0 items-center gap-3"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                p.estado === "HECHO" && "bg-brand-secondary text-white",
                p.estado === "ACTUAL" && "bg-brand-cta text-white",
                p.estado === "PENDIENTE" && "bg-brand-line text-brand-text-muted",
              )}
            >
              {p.estado === "HECHO" ? (
                <Check aria-hidden className="size-4" />
              ) : p.estado === "ACTUAL" && p.numero === 3 ? (
                "!"
              ) : (
                p.numero
              )}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  p.estado === "PENDIENTE" ? "text-brand-text-muted" : "text-brand-text",
                )}
              >
                {p.titulo}
              </p>
              {p.nota ? (
                <p className="text-xs text-brand-text-muted">
                  {p.href ? (
                    <Link
                      href={p.href}
                      className="font-medium text-brand-primary hover:underline"
                    >
                      {p.nota}
                    </Link>
                  ) : (
                    p.nota
                  )}
                </p>
              ) : null}
            </div>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
