import { cn } from "@/lib/utils";
import { nivelAtraso, type NivelAtraso } from "./calculos";

const ESTILO: Record<NivelAtraso, string> = {
  leve: "bg-brand-cta/15 text-brand-cta",
  medio: "bg-brand-coral/15 text-brand-coral",
  grave: "bg-brand-danger/15 text-brand-danger",
};

const BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";

/** Chip de atraso escalonado por días vencidos: "Atraso 19 días". */
export function ChipAtraso({ dias }: { dias: number }) {
  return (
    <span className={cn(BASE, ESTILO[nivelAtraso(dias)])}>
      Atraso {dias} {dias === 1 ? "día" : "días"}
    </span>
  );
}

/** Chip de las facturas sin atraso: "Pagado" o "Por vencer". */
export function ChipCobro({ pagada }: { pagada: boolean }) {
  return (
    <span className={cn(BASE, "bg-brand-secondary/15 text-brand-primary")}>
      {pagada ? "Pagado" : "Por vencer"}
    </span>
  );
}
