"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/shared";
import { BarChart3 } from "lucide-react";
import { formatearValor } from "./formato";
import type { Grafica, TonoBarra } from "./tipos";

const COLOR_TONO: Readonly<Record<TonoBarra, string>> = {
  verde: "var(--brand-secondary)",
  ambar: "var(--brand-cta)",
  rojo: "var(--brand-danger)",
  indigo: "var(--brand-indigo)",
  primario: "var(--brand-primary)",
};

const ALTO_BARRA = 30;
const ALTO_MINIMO = 200;

/** Barras horizontales: las etiquetas largas (plazas, proyectos) se leen completas. */
export function GraficaBarras({
  grafica,
  etiqueta,
}: {
  grafica: Grafica;
  /** Descripción accesible de la gráfica. */
  etiqueta: string;
}) {
  if (grafica.puntos.length === 0) {
    return (
      <EmptyState
        icono={BarChart3}
        titulo="Sin datos para graficar"
        descripcion="Prueba con otro alcance de ciudad o plaza."
      />
    );
  }
  const alto = Math.max(ALTO_MINIMO, grafica.puntos.length * ALTO_BARRA + 40);
  return (
    <div style={{ height: alto }} role="img" aria-label={etiqueta}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={grafica.puntos}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 0, left: 8 }}
        >
          <CartesianGrid stroke="var(--brand-line)" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            stroke="var(--brand-text-muted)"
            fontSize={12}
            tickFormatter={(v) => formatearValor(Number(v), grafica.formato)}
          />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={150}
            tickLine={false}
            axisLine={false}
            stroke="var(--brand-text-muted)"
            fontSize={12}
          />
          <Tooltip
            cursor={{ fill: "var(--brand-cream)" }}
            formatter={(v) => [formatearValor(Number(v), grafica.formato), grafica.serie]}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {grafica.puntos.map((p) => (
              <Cell key={p.etiqueta} fill={COLOR_TONO[p.tono ?? "primario"]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
