import { DEMO_TODAY } from "@/domain";
import { formatDiaMes } from "@/lib/format";
import type { EventoActividad } from "./calculos";

function momento(e: EventoActividad): string {
  if (!e.fecha) return "";
  if (e.fecha === DEMO_TODAY) return e.hora ? `Hoy ${e.hora}` : "Hoy";
  return formatDiaMes(e.fecha);
}

/** Actividad con el momento a la izquierda y el hecho a la derecha; lo más reciente arriba. */
export function ActividadCotizacion({
  eventos,
}: {
  eventos: readonly EventoActividad[];
}) {
  return (
    <ol className="space-y-3.5">
      {[...eventos].reverse().map((e) => (
        <li key={e.id} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 text-sm">
          <span className="text-brand-text-muted">{momento(e)}</span>
          <div>
            <p className="text-brand-text">{e.titulo}</p>
            {e.detalle ? (
              <p className="text-xs text-brand-text-muted">{e.detalle}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
