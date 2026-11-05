"use client";

import { useMemo } from "react";
import { KpiCard, KpiRow } from "@/components/shared";
import { DEMO_TODAY, kpisMantenimiento, type Mantenimiento } from "@/domain";
import {
  formatMesAnio,
  formatMoneda,
  formatNumero,
  formatPorcentaje,
} from "@/lib/format";

/** Los cuatro KPIs, calculados siempre desde la lista que reciben. */
export function KpisMantenimiento({
  mantenimientos,
}: {
  mantenimientos: readonly Mantenimiento[];
}) {
  const kpis = useMemo(
    () => kpisMantenimiento(mantenimientos, DEMO_TODAY),
    [mantenimientos],
  );
  return (
    <KpiRow>
      <KpiCard
        etiqueta="Abiertos"
        valor={formatNumero(kpis.abiertos)}
        subtexto="programados y en proceso"
      />
      <KpiCard
        etiqueta="Atrasados"
        valor={formatNumero(kpis.atrasados)}
        subtexto="programados con fecha vencida"
        tono={kpis.atrasados > 0 ? "peligro" : "neutro"}
        detalle={kpis.atrasados > 0 ? "Requieren atención" : undefined}
      />
      <KpiCard
        etiqueta="Gasto del mes"
        valor={formatMoneda(kpis.gastoMes)}
        subtexto={`a cargo de la plaza · ${formatMesAnio(DEMO_TODAY)}`}
      />
      <KpiCard
        etiqueta="% preventivo"
        valor={formatPorcentaje(kpis.pctPreventivo)}
        subtexto="del total, sin cancelados"
      />
    </KpiRow>
  );
}
