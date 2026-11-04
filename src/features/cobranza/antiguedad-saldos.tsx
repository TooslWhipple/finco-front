import { SectionCard } from "@/components/shared";
import type { CuboAntiguedad, RangoAntiguedad } from "@/domain";
import { formatMillones } from "./formato";

const COLOR: Record<RangoAntiguedad, string> = {
  "1-30": "bg-brand-cta",
  "31-60": "bg-brand-coral",
  "61-90": "bg-brand-danger",
  "+90": "bg-brand-danger",
};

interface AntiguedadSaldosProps {
  /** Monto de las facturas que no están vencidas. */
  alCorriente: number;
  cubos: readonly CuboAntiguedad[];
}

export function AntiguedadSaldos({ alCorriente, cubos }: AntiguedadSaldosProps) {
  const filas = [
    {
      clave: "corriente",
      etiqueta: "Al corriente",
      monto: alCorriente,
      color: "bg-brand-secondary",
    },
    ...cubos.map((c) => ({
      clave: c.rango,
      etiqueta: `${c.rango.replace("-", "–")} días`,
      monto: c.monto,
      color: COLOR[c.rango],
    })),
  ];
  const maximo = Math.max(...filas.map((f) => f.monto), 1);
  return (
    <SectionCard titulo="Antigüedad de saldos">
      <ul className="space-y-2.5">
        {filas.map((f) => (
          <li key={f.clave} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-brand-text">{f.etiqueta}</span>
            <div className="h-2 flex-1 rounded-full bg-brand-cream">
              <div
                className={`h-2 rounded-full ${f.color}`}
                style={{
                  width: `${f.monto > 0 ? Math.max((f.monto / maximo) * 100, 2) : 0}%`,
                }}
              />
            </div>
            <span className="w-20 shrink-0 text-right font-semibold text-brand-primary tabular-nums">
              {formatMillones(f.monto)}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
