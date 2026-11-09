"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TonoSerie = "primario" | "verde" | "naranja" | "coral" | "indigo";

const COLOR_SERIE: Readonly<Record<TonoSerie, string>> = {
  primario: "var(--brand-primary)",
  verde: "var(--brand-secondary)",
  naranja: "var(--brand-cta)",
  coral: "var(--brand-danger)",
  indigo: "var(--brand-indigo)",
};

export interface SerieLineas {
  /** Clave del valor dentro de cada punto de `datos`. */
  clave: string;
  etiqueta: string;
  tono: TonoSerie;
  /** Trazo punteado, para series de plan o referencia. */
  discontinua?: boolean;
}

/** Un punto del eje X con el valor de cada serie (`null` corta la línea). */
export type PuntoLineas = Readonly<Record<string, string | number | null>>;

interface GraficaLineasProps {
  datos: readonly PuntoLineas[];
  /** Clave del punto que da el eje X (categoría ya ordenada). */
  claveX: string;
  series: readonly SerieLineas[];
  /** Texto de un valor del eje Y y del tooltip. */
  formatoValor: (valor: number) => string;
  /** Texto de una categoría del eje X y del tooltip. */
  formatoX?: (valor: string) => string;
  /** Línea horizontal de referencia (por ejemplo, el presupuesto base). */
  lineaReferencia?: { valor: number; etiqueta: string };
  /** Línea vertical sobre una categoría del eje X (por ejemplo, "hoy"). */
  marcadorX?: { valor: string; etiqueta: string };
  /** Descripción accesible de la gráfica. */
  etiqueta: string;
  /** Alto en px. */
  alto?: number;
}

/** Gráfica de líneas con varias series, línea de referencia y marcador vertical opcionales. */
export function GraficaLineas({
  datos,
  claveX,
  series,
  formatoValor,
  formatoX = (valor) => valor,
  lineaReferencia,
  marcadorX,
  etiqueta,
  alto = 320,
}: GraficaLineasProps) {
  return (
    <div style={{ height: alto }} role="img" aria-label={etiqueta}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...datos]} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--brand-line)" vertical={false} />
          <XAxis
            dataKey={claveX}
            tickLine={false}
            axisLine={false}
            stroke="var(--brand-text-muted)"
            fontSize={12}
            minTickGap={32}
            tickFormatter={(v) => formatoX(String(v))}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            stroke="var(--brand-text-muted)"
            fontSize={12}
            tickFormatter={(v) => formatoValor(Number(v))}
          />
          <Tooltip
            labelFormatter={(v) => formatoX(String(v))}
            formatter={(v) => formatoValor(Number(v))}
          />
          <Legend verticalAlign="top" height={28} iconType="plainline" />
          {lineaReferencia ? (
            <ReferenceLine
              y={lineaReferencia.valor}
              stroke="var(--brand-text-muted)"
              strokeDasharray="2 4"
              label={{
                value: lineaReferencia.etiqueta,
                position: "insideTopLeft",
                fontSize: 11,
                fill: "var(--brand-text-muted)",
              }}
            />
          ) : null}
          {marcadorX ? (
            <ReferenceLine
              x={marcadorX.valor}
              stroke="var(--brand-cta)"
              strokeDasharray="4 3"
              label={{
                value: marcadorX.etiqueta,
                position: "insideTopRight",
                fontSize: 11,
                fill: "var(--brand-cta)",
              }}
            />
          ) : null}
          {series.map((serie) => (
            <Line
              key={serie.clave}
              type="monotone"
              dataKey={serie.clave}
              name={serie.etiqueta}
              stroke={COLOR_SERIE[serie.tono]}
              strokeWidth={2}
              strokeDasharray={serie.discontinua ? "6 4" : undefined}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
