"use client";

import { useMemo } from "react";
import { History, Info, TriangleAlert } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, EmptyState, MoneyAmount, SectionCard } from "@/components/shared";
import {
  INPC_ANUAL,
  repricingAlLiberar,
  type Local,
  type ReglaActualizacion,
} from "@/domain";
import { formatFecha, formatMoneda } from "@/lib/format";
import { añoBaseRepricing, añosRepricing, formatPuntosUnDecimal } from "./calculos";

interface FilaRepricing {
  año: number;
  inpc: number | null;
  incrementoPct: number | null;
  precio: number;
  /** Mínimo autorizado tras aplicar la regla ese año. */
  minimo: number;
  /** Texto de la columna Regla. */
  regla: string;
}

/** Año, Regla (absorbe el resto), Ajuste, Lista, Mínimo: la tabla comparte fila con la gráfica. */
const ANCHOS_COLUMNAS = [44, null, 52, 80, 80] as const;

const COLUMNAS: ColumnDef<FilaRepricing>[] = [
  {
    accessorKey: "año",
    header: "Año",
    cell: ({ row }) => <span className="font-semibold">{row.original.año}</span>,
  },
  {
    accessorKey: "regla",
    header: "Regla",
    cell: ({ row }) => (
      <span className="block text-xs leading-tight whitespace-normal text-brand-text-muted">
        {row.original.regla}
      </span>
    ),
  },
  {
    accessorKey: "incrementoPct",
    header: "Ajuste",
    cell: ({ row }) =>
      row.original.incrementoPct === null
        ? "—"
        : `+${formatPuntosUnDecimal(row.original.incrementoPct)}`,
  },
  {
    accessorKey: "precio",
    header: "Lista",
    cell: ({ row }) => (
      <MoneyAmount valor={row.original.precio} className="font-semibold" />
    ),
  },
  {
    accessorKey: "minimo",
    header: "Mínimo",
    cell: ({ row }) => <MoneyAmount valor={row.original.minimo} />,
  },
];

/** Descripción de la regla aplicada en un año: "INPC 7.8% + 1 pt". */
function describirAplicacion(regla: ReglaActualizacion, inpc: number | null): string {
  switch (regla.tipo) {
    case "INPC":
      return `INPC ${inpc === null ? "—" : formatPuntosUnDecimal(inpc)}`;
    case "INPC_PTS": {
      const pts = regla.puntos ?? 0;
      return `INPC ${inpc === null ? "—" : formatPuntosUnDecimal(inpc)} + ${pts} pt${pts === 1 ? "" : "s"}`;
    }
    case "VALOR_FIJO":
      return `Valor fijo ${formatPuntosUnDecimal(regla.porcentajeFijo ?? 0)}`;
  }
}

interface RepricingProps {
  local: Local;
  /** Regla a simular: la guardada o el borrador en edición. */
  regla: ReglaActualizacion;
}

function redondearEje(valor: number, paso: number, arriba: boolean): number {
  const n = valor / paso;
  return (arriba ? Math.ceil(n) : Math.floor(n)) * paso;
}

export function Repricing({ local, regla }: RepricingProps) {
  const años = useMemo(() => añosRepricing(local.historial), [local.historial]);
  const añoBase = añoBaseRepricing(local.historial);
  const resultado = useMemo(
    () => repricingAlLiberar(local.historial, regla, años),
    [local.historial, regla, años],
  );

  const filas = useMemo<FilaRepricing[]>(() => {
    if (!resultado || añoBase === null) return [];
    return [
      {
        año: añoBase,
        inpc: null,
        incrementoPct: null,
        precio: resultado.precioBase,
        minimo: resultado.minimoBase,
        regla: "Último contrato firmado",
      },
      ...resultado.pasos.map((p) => ({
        año: p.año,
        inpc: INPC_ANUAL[p.año] ?? null,
        incrementoPct: p.incrementoPct,
        precio: p.precio,
        minimo: p.minimo,
        regla: describirAplicacion(regla, INPC_ANUAL[p.año] ?? null),
      })),
    ];
  }, [resultado, añoBase, regla]);

  if (!resultado || resultado.pasos.length === 0) {
    return (
      <SectionCard titulo="Repricing al liberar el local">
        <EmptyState
          icono={History}
          titulo="Sin base para calcular el repricing"
          descripcion={
            resultado
              ? "El último precio registrado es de este año: no hay años por actualizar."
              : "El local no tiene historial de precios, así que no hay precio de partida."
          }
        />
      </SectionCard>
    );
  }

  const diferencia = resultado.precioFinal - local.precioVigente;
  const bajoMinimo = resultado.precioFinal < resultado.minimoFinal;
  const valores = filas.flatMap((f) => [f.precio, f.minimo]);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const dominio: [number, number] = [
    redondearEje(minimo, 1000, false) - 1000,
    redondearEje(maximo, 1000, true) + 1000,
  ];

  const primero = filas[0];
  const ultimo = filas[filas.length - 1];

  return (
    <SectionCard
      titulo={
        <span className="flex flex-wrap items-center gap-3">
          Repricing al liberar el local
          {local.libreDesde ? (
            <span className="rounded-full bg-brand-cta/15 px-2.5 py-0.5 font-sans text-xs font-medium text-brand-cta">
              Liberado {formatFecha(local.libreDesde)}
            </span>
          ) : null}
        </span>
      }
      extra="no regresa al precio original"
    >
      <div className="grid items-center gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div
          className="h-64 min-w-0"
          role="img"
          aria-label="Evolución del precio de lista y del mínimo autorizado por año"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filas}
              margin={{ top: 40, right: 24, bottom: 0, left: 24 }}
            >
              <defs>
                <linearGradient id="repricing-area" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--brand-secondary)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--brand-secondary)"
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--brand-line)" vertical={false} />
              <XAxis
                dataKey="año"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="var(--brand-text-muted)"
                fontSize={12}
              />
              <YAxis hide domain={dominio} />
              <Tooltip
                formatter={(v, nombre) => [formatMoneda(Number(v)), nombre]}
                labelFormatter={(l) => `Año ${l}`}
              />
              <Line
                type="linear"
                dataKey="minimo"
                name="Mínimo autorizado"
                stroke="var(--brand-cta)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{
                  r: 3,
                  fill: "var(--card)",
                  stroke: "var(--brand-cta)",
                  strokeWidth: 2,
                }}
                label={(props: {
                  x?: number | string;
                  y?: number | string;
                  index?: number;
                }) => {
                  const { x, y, index } = props;
                  if (typeof x !== "number" || typeof y !== "number") return <g />;
                  if (index !== filas.length - 1) return <g />;
                  return (
                    <text
                      x={x}
                      y={y + 18}
                      textAnchor="end"
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--brand-cta)"
                    >
                      {`Mínimo ${formatMoneda(ultimo.minimo)}`}
                    </text>
                  );
                }}
                isAnimationActive={false}
              />
              <Area
                type="linear"
                dataKey="precio"
                stroke="none"
                fill="url(#repricing-area)"
                isAnimationActive={false}
                activeDot={false}
              />
              <Line
                type="linear"
                dataKey="precio"
                name="Precio de lista"
                stroke="var(--brand-primary)"
                strokeWidth={2.5}
                dot={{
                  r: 4.5,
                  fill: "var(--card)",
                  stroke: "var(--brand-primary)",
                  strokeWidth: 2,
                }}
                label={(props: {
                  x?: number | string;
                  y?: number | string;
                  index?: number;
                }) => {
                  const { x, y, index } = props;
                  if (typeof x !== "number" || typeof y !== "number") return <g />;
                  const esUltimo = index === filas.length - 1;
                  if (index !== 0 && !esUltimo) return <g />;
                  const fila = esUltimo ? ultimo : primero;
                  return (
                    <text
                      x={x}
                      y={esUltimo ? y - 12 : y + 20}
                      textAnchor={esUltimo ? "end" : "start"}
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--brand-primary)"
                    >
                      {formatMoneda(fila.precio)}
                    </text>
                  );
                }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <DataTable columns={COLUMNAS} data={filas} anchos={ANCHOS_COLUMNAS} />
      </div>
      <div
        className={`mt-4 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
          bajoMinimo ? "bg-brand-coral/10" : "bg-brand-secondary/15"
        }`}
      >
        {bajoMinimo ? (
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-brand-coral"
          />
        ) : (
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-primary" />
        )}
        <p>
          El último contrato se firmó en {añoBase} en{" "}
          <strong>{formatMoneda(resultado.precioBase)}</strong>. Al liberarse, el sistema
          aplicó la regla por los {resultado.pasos.length} años transcurridos: el nuevo
          precio de lista es <strong>{formatMoneda(resultado.precioFinal)}</strong> y el
          mínimo autorizado sube a <strong>{formatMoneda(resultado.minimoFinal)}</strong>
          {diferencia === 0
            ? "."
            : ` (${formatMoneda(Math.abs(diferencia))} ${
                diferencia > 0 ? "por encima" : "por debajo"
              } del precio de lista actual, ${formatMoneda(local.precioVigente)}).`}
          {bajoMinimo
            ? ` Queda por debajo del mínimo autorizado (${formatMoneda(resultado.minimoFinal)}): prevalece el mínimo.`
            : ""}
        </p>
      </div>
    </SectionCard>
  );
}
