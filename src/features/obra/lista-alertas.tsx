import { BellRing } from "lucide-react";
import { EmptyState, SectionCard, StatusChip } from "@/components/shared";
import type { AlertaObra, NivelAlerta } from "@/domain";

const CHIP_NIVEL = {
  ROJO: { estatus: "ROJO", etiqueta: "Crítica" },
  AMBAR: { estatus: "AMARILLO", etiqueta: "Atención" },
} as const satisfies Record<
  NivelAlerta,
  { estatus: "ROJO" | "AMARILLO"; etiqueta: string }
>;

/** Alertas del proyecto, de la más grave a la menos: nivel, texto y qué contrato señalan. */
export function ListaAlertas({ alertas }: { alertas: readonly AlertaObra[] }) {
  return (
    <SectionCard titulo={`Alertas (${alertas.length})`}>
      {alertas.length === 0 ? (
        <EmptyState
          icono={BellRing}
          titulo="Sin alertas"
          descripcion="La obra va en tiempo y en costo, y todos los contratos reportaron."
          className="py-6"
        />
      ) : (
        <ul className="divide-y divide-brand-line">
          {alertas.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <StatusChip
                estatus={CHIP_NIVEL[a.nivel].estatus}
                etiqueta={CHIP_NIVEL[a.nivel].etiqueta}
                className="mt-0.5 shrink-0"
              />
              <p className="text-sm text-brand-text">{a.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
