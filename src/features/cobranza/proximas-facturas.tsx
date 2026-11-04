"use client";

import { useState } from "react";
import { SectionCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { FacturasDelDia } from "./calculos";

const DIA_SEMANA = new Intl.DateTimeFormat("es-MX", { weekday: "short" });

function etiquetaDia(fecha: string): string {
  const texto = DIA_SEMANA.format(new Date(`${fecha}T12:00:00`)).replace(/\./g, "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Tira de los próximos días con el número de facturas que salen por aniversario. */
export function ProximasFacturas({ dias }: { dias: readonly FacturasDelDia[] }) {
  const [elegido, setElegido] = useState(dias[0]?.fecha);
  return (
    <SectionCard titulo="Próximas facturas por aniversario">
      <ul className="grid grid-cols-7 gap-1.5">
        {dias.map((d) => {
          const activo = d.fecha === elegido;
          return (
            <li key={d.fecha}>
              <button
                type="button"
                aria-pressed={activo}
                onClick={() => setElegido(d.fecha)}
                className={cn(
                  "flex w-full flex-col items-center rounded-lg px-1 py-2 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  activo
                    ? "bg-brand-primary text-white"
                    : "bg-brand-cream text-brand-text-muted hover:bg-brand-line",
                )}
              >
                <span className="text-[0.7rem]">{etiquetaDia(d.fecha)}</span>
                <span
                  className={cn(
                    "font-heading text-lg leading-tight font-bold",
                    !activo && "text-brand-primary",
                  )}
                >
                  {d.fecha.slice(8, 10)}
                </span>
                <span className={cn("text-[0.7rem]", !activo && "text-brand-secondary")}>
                  {d.facturas} fact.
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
