"use client";

import { useEstadoIntegracion, useSesion } from "@/hooks";
import { haceCuanto } from "@/lib/tiempo";

/** Píldora global del estado de EnKontrol; el contratista externo no la ve. */
export function PildoraSync() {
  const { rol } = useSesion();
  return rol === "CONTRATISTA" ? null : <PildoraEnKontrol />;
}

function PildoraEnKontrol() {
  const { datos } = useEstadoIntegracion();
  return (
    <div
      role="status"
      className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-brand-secondary/15 px-4 text-sm font-medium whitespace-nowrap text-brand-primary xl:flex"
    >
      <span aria-hidden className="size-2 rounded-full bg-brand-secondary" />
      EnKontrol sincronizado{datos ? ` · ${haceCuanto(datos.ultimoSync)}` : ""}
    </div>
  );
}
