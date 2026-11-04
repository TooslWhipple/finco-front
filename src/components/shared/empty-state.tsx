import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icono: LucideIcon;
  titulo: string;
  descripcion?: ReactNode;
  /** Botón o enlace de salida. */
  accion?: ReactNode;
  className?: string;
}

export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-secondary/15 text-brand-primary">
        <Icono className="size-6" aria-hidden />
      </span>
      <h3 className="font-heading text-lg font-semibold text-brand-primary">{titulo}</h3>
      {descripcion ? (
        <p className="max-w-md text-sm text-brand-text-muted">{descripcion}</p>
      ) : null}
      {accion}
    </div>
  );
}
