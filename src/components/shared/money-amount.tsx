import { formatMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyAmountProps {
  valor: number;
  /** Antepone "+" a los positivos (diferencias). */
  conSigno?: boolean;
  /** Tacha el monto (precio anterior). */
  tachado?: boolean;
  /** Sufijo como "/mes". */
  sufijo?: string;
  className?: string;
}

export function MoneyAmount({
  valor,
  conSigno,
  tachado,
  sufijo,
  className,
}: MoneyAmountProps) {
  const texto = formatMoneda(valor);
  return (
    <span className={cn("tabular-nums", tachado && "line-through opacity-60", className)}>
      {conSigno && valor > 0 ? "+" : ""}
      {texto}
      {sufijo ? <span className="text-brand-text-muted">{sufijo}</span> : null}
    </span>
  );
}
