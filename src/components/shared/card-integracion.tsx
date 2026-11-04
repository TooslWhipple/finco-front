import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MetricaIntegracion {
  etiqueta: string;
  valor: ReactNode;
}

interface CardIntegracionProps {
  nombre: string;
  descripcion: string;
  icono: ReactNode;
  /** Normalmente un `StatusChip`. */
  estado: ReactNode;
  /** Texto ya formateado, p. ej. "hoy 08:30" o "Nunca". */
  ultimoSync: string;
  metricas: readonly MetricaIntegracion[];
  sincronizando?: boolean;
  /** Sin esta función el botón no se muestra (rol sin permiso). */
  onSincronizar?: () => void;
  /** Contenido extra (p. ej. enlace a diferencias). */
  pie?: ReactNode;
  className?: string;
}

/** Card de una integración externa: estado, último sync, métricas y "Sincronizar ahora". */
export function CardIntegracion({
  nombre,
  descripcion,
  icono,
  estado,
  ultimoSync,
  metricas,
  sincronizando,
  onSincronizar,
  pie,
  className,
}: CardIntegracionProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-brand-line bg-card p-5 shadow-xs",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-cream text-brand-primary"
          aria-hidden
        >
          {icono}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-semibold text-brand-primary">
            {nombre}
          </h3>
          <p className="text-sm text-brand-text-muted">{descripcion}</p>
        </div>
        {estado}
      </header>
      <dl className="grid grid-cols-2 gap-3">
        {metricas.map((m) => (
          <div key={m.etiqueta}>
            <dt className="text-xs text-brand-text-muted">{m.etiqueta}</dt>
            <dd className="text-sm font-semibold text-brand-text tabular-nums">
              {m.valor}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-brand-text-muted">Último sync: {ultimoSync}</p>
      {pie}
      {onSincronizar ? (
        <Button
          variant="outline"
          onClick={onSincronizar}
          disabled={sincronizando}
          className="self-start"
        >
          <RefreshCw
            className={cn("size-4", sincronizando && "animate-spin")}
            aria-hidden
          />
          {sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
        </Button>
      ) : null}
    </article>
  );
}
