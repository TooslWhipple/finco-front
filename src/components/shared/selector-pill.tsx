import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpcionSelector {
  valor: string;
  etiqueta: string;
}

interface SelectorPillProps {
  etiqueta: string;
  valor: string;
  opciones: readonly OpcionSelector[];
  onChange: (valor: string) => void;
  className?: string;
}

/** Desplegable nativo con aspecto de pill, para vivir en una `BarraFiltros`. */
export function SelectorPill({
  etiqueta,
  valor,
  opciones,
  onChange,
  className,
}: SelectorPillProps) {
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <select
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-full border border-brand-line bg-card pr-8 pl-4 text-sm font-medium text-brand-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-lg:h-11 pointer-coarse:h-11"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 size-4 text-brand-text-muted"
      />
    </span>
  );
}
