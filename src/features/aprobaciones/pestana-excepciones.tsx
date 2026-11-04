"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { EmptyState, MoneyAmount, SectionCard, StatusChip } from "@/components/shared";
import { can } from "@/config/permissions";
import {
  useCotizaciones,
  useExcepciones,
  useLocales,
  usePlazas,
  useSesion,
} from "@/hooks";
import { cn } from "@/lib/utils";
import { ordenarExcepciones } from "./calculos";
import { PanelExcepcion } from "./panel-excepcion";

export function PestanaExcepciones() {
  const { rol } = useSesion();
  const excepciones = useExcepciones();
  const cotizaciones = useCotizaciones();
  const locales = useLocales().datos;
  const plazas = usePlazas().datos;
  const [elegida, setElegida] = useState<string>();

  const ordenadas = useMemo(() => ordenarExcepciones(excepciones), [excepciones]);
  const seleccionada = ordenadas.find((e) => e.id === elegida) ?? ordenadas[0];

  if (ordenadas.length === 0) {
    return (
      <EmptyState
        icono={Inbox}
        titulo="Sin excepciones"
        descripcion="Cuando Ventas solicite una excepción de precio aparecerá aquí."
      />
    );
  }

  const local = locales?.find((l) => l.id === seleccionada.localId);
  const plaza = plazas?.find((p) => p.id === local?.plazaId)?.nombre;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <SectionCard titulo="Solicitudes" sinPadding>
        <ul className="divide-y divide-brand-line">
          {ordenadas.map((e) => {
            const l = locales?.find((x) => x.id === e.localId);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setElegida(e.id)}
                  aria-current={e.id === seleccionada.id}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-cream",
                    e.id === seleccionada.id && "bg-brand-cream",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-brand-text">
                      {l?.codigo ?? e.localId} · {e.cotizacionId}
                    </span>
                    <span className="block text-xs text-brand-text-muted">
                      {e.solicitadaPor} ·{" "}
                      <MoneyAmount valor={e.rentaSolicitada} sufijo="/mes" />
                    </span>
                  </span>
                  <StatusChip estatus={e.estado} />
                </button>
              </li>
            );
          })}
        </ul>
      </SectionCard>
      <PanelExcepcion
        key={seleccionada.id}
        excepcion={seleccionada}
        cotizacion={cotizaciones.find((c) => c.id === seleccionada.cotizacionId)}
        local={local}
        plaza={plaza}
        puedeResolver={can(rol, "excepcion.resolver")}
      />
    </div>
  );
}
