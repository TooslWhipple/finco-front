"use client";

import type { CanalAviso } from "@/domain";
import type { OpcionSegmento } from "@/components/shared";
import { cn } from "@/lib/utils";

/** Etiqueta visible de cada canal de aviso. */
export const ETIQUETA_CANAL: Record<CanalAviso, string> = {
  WHATSAPP: "WhatsApp",
  CORREO: "Correo",
};

/** Opciones del selector de canal, en el orden en que se muestran. */
export const OPCIONES_CANAL: readonly OpcionSegmento<CanalAviso>[] = (
  ["WHATSAPP", "CORREO"] as const
).map((valor) => ({ valor, etiqueta: ETIQUETA_CANAL[valor] }));

/** Lleva los botones de un `SegmentedControl` al mínimo táctil de 44 px. */
export const SOLO_44 = "[&_button]:min-h-11 [&_button]:px-4";

interface InterruptorProgramacionProps {
  /** Si la programación está encendida. */
  activa: boolean;
  /** Texto del interruptor, ya con su estado ("Envío automático activo"). */
  etiqueta: string;
  disabled?: boolean;
  onToggle: () => void;
}

/** Interruptor (`role="switch"`) que enciende o apaga una ejecución programada. */
export function InterruptorProgramacion({
  activa,
  etiqueta,
  disabled = false,
  onToggle,
}: InterruptorProgramacionProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activa}
      disabled={disabled}
      onClick={onToggle}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-brand-line px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
    >
      {etiqueta}
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
          activa ? "bg-brand-secondary" : "bg-brand-line",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-white shadow-xs transition-transform",
            activa ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
