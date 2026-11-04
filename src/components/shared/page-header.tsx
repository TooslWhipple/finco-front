import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: ReactNode;
  descripcion?: ReactNode;
  /** Botones de acción alineados a la derecha. */
  acciones?: ReactNode;
}

export function PageHeader({ titulo, descripcion, acciones }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold text-brand-primary">{titulo}</h1>
        {descripcion ? (
          <p className="mt-1 text-sm text-brand-text-muted">{descripcion}</p>
        ) : null}
      </div>
      {acciones ? (
        <div className="flex flex-wrap items-center gap-2">{acciones}</div>
      ) : null}
    </header>
  );
}
