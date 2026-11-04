import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SeccionPanel {
  titulo: string;
  contenido: ReactNode;
}

interface PanelDetalleProps {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** Chip o pill de estado junto al título. */
  estado?: ReactNode;
  secciones: readonly SeccionPanel[];
  /** Botones de acción al pie. */
  acciones?: ReactNode;
  onCerrar?: () => void;
  className?: string;
}

/** Panel lateral de detalle: cabecera, secciones apiladas y acciones al pie. */
export function PanelDetalle({
  titulo,
  subtitulo,
  estado,
  secciones,
  acciones,
  onCerrar,
  className,
}: PanelDetalleProps) {
  return (
    <aside
      className={cn(
        "flex flex-col rounded-xl border border-brand-line bg-card shadow-xs",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-brand-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-brand-primary">
            {titulo}
          </h2>
          {subtitulo ? (
            <p className="mt-0.5 text-sm text-brand-text-muted">{subtitulo}</p>
          ) : null}
          {estado ? <div className="mt-2">{estado}</div> : null}
        </div>
        {onCerrar ? (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar detalle"
            className="rounded-md p-1 text-brand-text-muted hover:bg-brand-cream hover:text-brand-primary"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {secciones.map((s) => (
          <section key={s.titulo}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-brand-text-muted uppercase">
              {s.titulo}
            </h3>
            <div className="text-sm text-brand-text">{s.contenido}</div>
          </section>
        ))}
      </div>
      {acciones ? (
        <footer className="flex flex-wrap gap-2 border-t border-brand-line px-5 py-3">
          {acciones}
        </footer>
      ) : null}
    </aside>
  );
}
