import { formatDiaMes } from "@/lib/format";
import type { TramoGantt, ViewModelGantt } from "./agregados";

const ANCHO_SEMANA = "2.25rem";
const ANCHO_ETIQUETA = "13rem";

const posicion = (t: TramoGantt) => ({ gridColumn: `${t.columna} / span ${t.semanas}` });

/**
 * Gantt de CSS grid: una columna por semana y una fila por actividad, con el
 * plan (tenue) contra lo real (sólido) y la línea de hoy. Hace scroll dentro de su tarjeta.
 */
export function CronogramaGantt({ modelo }: { modelo: ViewModelGantt }) {
  const columnas = `repeat(${modelo.semanas}, minmax(${ANCHO_SEMANA}, 1fr))`;
  const plantilla = `${ANCHO_ETIQUETA} minmax(0, 1fr)`;
  return (
    <div className="overflow-x-auto" role="table" aria-label="Cronograma de obra">
      <div
        className="grid min-w-max"
        style={{ gridTemplateColumns: plantilla }}
        role="rowgroup"
      >
        <div className="sticky left-0 z-10 border-b border-brand-line bg-card" />
        <div
          className="grid border-b border-brand-line text-[11px] text-brand-text-muted"
          style={{ gridTemplateColumns: columnas }}
        >
          {modelo.encabezados.map((e) => (
            <span key={e.columna} className="h-6 px-1 whitespace-nowrap">
              {e.etiqueta ? formatDiaMes(e.etiqueta) : ""}
            </span>
          ))}
        </div>
        {modelo.grupos.map((grupo) => (
          <div key={grupo.fase} className="contents" role="rowgroup">
            <div className="sticky left-0 z-10 col-span-full bg-brand-cream px-2 py-1 text-xs font-semibold tracking-wide text-brand-primary uppercase">
              {grupo.etiqueta}
            </div>
            {grupo.filas.map((fila) => (
              <div key={fila.id} className="contents" role="row">
                <div
                  className="sticky left-0 z-10 flex items-center border-b border-brand-line bg-card px-2 text-sm"
                  role="rowheader"
                >
                  {fila.etiqueta}
                </div>
                <div
                  className="relative grid auto-rows-[0.5rem] content-center gap-y-0.5 border-b border-brand-line py-2"
                  style={{ gridTemplateColumns: columnas }}
                  role="cell"
                >
                  <span
                    aria-hidden
                    className="border-l-2 border-brand-cta"
                    style={{ gridColumn: modelo.columnaHoy, gridRow: "1 / span 2" }}
                  />
                  <span
                    className="rounded-sm bg-brand-primary/20"
                    style={{ ...posicion(fila.plan), gridRow: 1 }}
                    title="Plan"
                  />
                  {fila.real ? (
                    <span
                      className="rounded-sm bg-brand-primary"
                      style={{ ...posicion(fila.real), gridRow: 2 }}
                      title="Real"
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
