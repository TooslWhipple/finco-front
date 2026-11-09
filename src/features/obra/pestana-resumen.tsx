import { SectionCard } from "@/components/shared";
import { avanceEsperado } from "@/domain";
import { formatFecha, formatNumero } from "@/lib/format";
import { HitosTerreno } from "@/features/terrenos/hitos-terreno";
import { UbicacionTerreno } from "@/features/terrenos/ubicacion-terreno";
import type { ContextoExpediente } from "./contexto";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-text-muted">{etiqueta}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  );
}

/** Hitos del proyecto a la izquierda; ubicación y datos clave a la derecha. */
export function PestanaResumen({ terreno: t, posicion, hoy }: ContextoExpediente) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <SectionCard titulo="Hitos del proyecto">
        <HitosTerreno hitos={t.hitos} />
      </SectionCard>
      <SectionCard titulo="Ubicación y datos clave">
        <div className="space-y-4">
          <UbicacionTerreno nombre={t.nombre} posicion={posicion} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Dato
              etiqueta="Avance de la etapa"
              valor={`${t.avancePct}% (esperado ${Math.round(avanceEsperado(t, hoy))}%)`}
            />
            <Dato etiqueta="Inicio" valor={formatFecha(t.inicioDesarrollo)} />
            <Dato etiqueta="Predio" valor={`${formatNumero(t.areaM2)} m²`} />
            <Dato
              etiqueta="Locales proyectados"
              valor={formatNumero(t.localesProyectados)}
            />
          </dl>
        </div>
      </SectionCard>
    </div>
  );
}
