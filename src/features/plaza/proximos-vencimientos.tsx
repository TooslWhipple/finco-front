"use client";

import Link from "next/link";
import { SectionCard } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Vencimiento } from "./resumen";

interface ProximosVencimientosProps {
  vencimientos: readonly Vencimiento[];
  /** Nombre del locatario por id. */
  locatarios: ReadonlyMap<string, string>;
}

export function ProximosVencimientos({
  vencimientos,
  locatarios,
}: ProximosVencimientosProps) {
  return (
    <SectionCard titulo="Próximos vencimientos" extra="90 días">
      {vencimientos.length === 0 ? (
        <p className="text-sm text-brand-text-muted">
          Ningún contrato vence en los próximos 90 días.
        </p>
      ) : (
        <ul className="divide-y divide-brand-line">
          {vencimientos.map(({ contrato, local }) => (
            <li key={contrato.id} className="flex items-center gap-3 py-2.5">
              <span className="w-12 shrink-0 text-sm font-semibold text-brand-primary">
                {local.codigo}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/contratos?contrato=${contrato.id}`}
                  className="block truncate text-sm font-medium text-brand-text hover:text-brand-primary hover:underline"
                >
                  {locatarios.get(contrato.locatarioId) ?? "Locatario"}
                </Link>
                <p className="text-xs text-brand-text-muted">
                  Vence {formatFecha(contrato.fin).replace(/^(\d) /, "0$1 ")}
                </p>
              </div>
              <Link
                href={`/cotizaciones/nueva?local=${local.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Renovar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
