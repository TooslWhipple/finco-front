import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ColumnaKanban<T> {
  id: string;
  titulo: string;
  items: readonly T[];
}

interface TableroKanbanProps<T> {
  columnas: readonly ColumnaKanban<T>[];
  /** Clave estable de cada tarjeta. */
  clave: (item: T) => string;
  renderTarjeta: (item: T) => ReactNode;
  /** Texto de una columna sin tarjetas. */
  vacio?: string;
  /** Nombre accesible del tablero. */
  etiqueta: string;
  className?: string;
}

/** Tablero por columnas con conteo; la tarjeta la pinta cada pantalla. */
export function TableroKanban<T>({
  columnas,
  clave,
  renderTarjeta,
  vacio = "Sin elementos",
  etiqueta,
  className,
}: TableroKanbanProps<T>) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn("flex gap-3 overflow-x-auto pb-2", className)}
    >
      {columnas.map((c) => (
        <section
          key={c.id}
          aria-label={c.titulo}
          className="flex w-64 min-w-64 flex-1 flex-col gap-2 rounded-xl border border-brand-line bg-brand-cream p-3"
        >
          <header className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-semibold text-brand-primary">
              {c.titulo}
            </h3>
            <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-brand-text-muted tabular-nums">
              {c.items.length}
            </span>
          </header>
          {c.items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-brand-line px-3 py-4 text-center text-xs text-brand-text-muted">
              {vacio}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {c.items.map((item) => (
                <li key={clave(item)}>{renderTarjeta(item)}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
