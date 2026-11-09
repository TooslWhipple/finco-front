import { CalendarRange } from "lucide-react";
import { EmptyState, SectionCard, StatusChip } from "@/components/shared";
import { viewModelGantt } from "./agregados";
import type { ContextoExpediente } from "./contexto";
import { CronogramaGantt } from "./cronograma-gantt";

/** Cronograma del proyecto, importado (simulado) de MS Project. */
export function PestanaCronograma({ cronograma, hoy }: ContextoExpediente) {
  const modelo = viewModelGantt(cronograma, hoy);
  return (
    <SectionCard
      titulo="Cronograma del proyecto"
      extra={<StatusChip estatus="IMPORTADO_SIMULADO" />}
      sinPadding
    >
      {modelo ? (
        <div className="px-5 pb-5">
          <p className="mb-3 flex flex-wrap items-center gap-4 text-xs text-brand-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-5 rounded-sm bg-brand-primary/20" />
              Plan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-5 rounded-sm bg-brand-primary" />
              Real
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-3 border-l-2 border-brand-cta" />
              Hoy
            </span>
          </p>
          <CronogramaGantt modelo={modelo} />
        </div>
      ) : (
        <EmptyState
          icono={CalendarRange}
          titulo="Sin cronograma de obra"
          descripcion="Este proyecto aún no tiene un cronograma importado."
        />
      )}
    </SectionCard>
  );
}
