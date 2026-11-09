import { CheckCircle2, Circle } from "lucide-react";
import type { HitoTerreno } from "@/domain";
import { formatFecha } from "@/lib/format";

/** Lista de hitos del proyecto (panel lateral y pestaña Resumen del expediente). */
export function HitosTerreno({ hitos }: { hitos: readonly HitoTerreno[] }) {
  return (
    <ol className="space-y-2">
      {hitos.map((h) => (
        <li key={h.id} className="flex items-start gap-2">
          {h.cumplido ? (
            <CheckCircle2
              aria-label="Cumplido"
              className="mt-0.5 size-4 shrink-0 text-brand-secondary"
            />
          ) : (
            <Circle
              aria-label="Pendiente"
              className="mt-0.5 size-4 shrink-0 text-brand-text-muted"
            />
          )}
          <span className="min-w-0">
            <span className="block">{h.titulo}</span>
            <span className="block text-xs text-brand-text-muted">
              {formatFecha(h.fecha)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
