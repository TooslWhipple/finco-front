"use client";

import { useEstadoIntegracion } from "@/hooks";
import { haceCuanto } from "@/lib/tiempo";

/** Píldora global del estado de EnKontrol. */
export function PildoraSync() {
  const { datos } = useEstadoIntegracion();
  return (
    <div
      role="status"
      className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand-secondary/15 px-4 text-sm font-medium whitespace-nowrap text-brand-primary"
    >
      <span aria-hidden className="size-2 rounded-full bg-brand-secondary" />
      EnKontrol sincronizado{datos ? ` · ${haceCuanto(datos.ultimoSync)}` : ""}
    </div>
  );
}
