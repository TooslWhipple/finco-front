"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  MoneyAmount,
  SectionCard,
  SegmentedControl,
} from "@/components/shared";
import { SOLO_44 } from "@/features/cobranza/controles-programacion";
import {
  comparativoPorConcepto,
  ETIQUETA_UNIDAD,
  rondasConPrecios,
  type ComparativoConceptos,
  type FilaComparativo,
  type Licitacion,
  type Proveedor,
} from "@/domain";
import { formatNumero } from "@/lib/format";
import { nombreProveedor } from "./agregados";

/** Un renglón de la matriz: un concepto o el total por proveedor al pie. */
type FilaMatriz = { tipo: "CONCEPTO"; fila: FilaComparativo } | { tipo: "TOTAL" };

const SIN_PRECIO = <span className="text-brand-text-muted">—</span>;

function columnas(
  comparativo: ComparativoConceptos,
  proveedores: readonly Proveedor[],
): ColumnDef<FilaMatriz>[] {
  const totalMasBajo = comparativo.proveedorIds.reduce<string | undefined>(
    (mejor, id) =>
      mejor === undefined || comparativo.totales[id] < comparativo.totales[mejor]
        ? id
        : mejor,
    undefined,
  );
  return [
    {
      id: "concepto",
      header: "Concepto",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.tipo === "TOTAL" ? (
          <span className="font-semibold text-brand-primary">Total</span>
        ) : (
          <span className="block min-w-48">
            <span className="block text-xs font-medium text-brand-text-muted">
              {row.original.fila.concepto.clave}
            </span>
            <span className="block text-brand-primary">
              {row.original.fila.concepto.descripcion}
            </span>
          </span>
        ),
    },
    {
      id: "volumen",
      header: "Volumen",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.tipo === "TOTAL" ? null : (
          <span className="whitespace-nowrap tabular-nums">
            {formatNumero(row.original.fila.concepto.volumen)}{" "}
            {ETIQUETA_UNIDAD[row.original.fila.concepto.unidad]}
          </span>
        ),
    },
    ...comparativo.proveedorIds.map((id): ColumnDef<FilaMatriz> => ({
      id: `pu-${id}`,
      header: nombreProveedor(proveedores, id),
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.tipo === "TOTAL") {
          return (
            <MoneyAmount
              valor={comparativo.totales[id]}
              className={
                id === totalMasBajo
                  ? "font-semibold text-brand-secondary"
                  : "font-semibold"
              }
            />
          );
        }
        const precio = row.original.fila.precios[id];
        if (precio === undefined) return SIN_PRECIO;
        const esMasBajo = row.original.fila.masBajoId === id;
        return (
          <span className="inline-flex items-center gap-1.5">
            <MoneyAmount
              valor={precio}
              className={esMasBajo ? "font-semibold text-brand-secondary" : undefined}
            />
            {esMasBajo ? <span className="sr-only">(precio más bajo)</span> : null}
          </span>
        );
      },
    })),
  ];
}

interface ComparativoConceptosProps {
  licitacion: Licitacion;
  proveedores: readonly Proveedor[];
}

/**
 * Matriz de precios unitarios por concepto y proveedor (sin descartados), con el
 * más bajo resaltado y el total al pie. Si hay varias rondas con precios, se elige
 * la ronda; por omisión, la más reciente. La matriz tiene su propio scroll.
 */
export function ComparativoPorConcepto({
  licitacion,
  proveedores,
}: ComparativoConceptosProps) {
  const rondas = rondasConPrecios(licitacion);
  const [elegida, setElegida] = useState<number | undefined>(undefined);
  const numero =
    elegida !== undefined && rondas.includes(elegida) ? elegida : rondas.at(-1);
  const comparativo =
    numero === undefined ? undefined : comparativoPorConcepto(licitacion, numero);
  if (!comparativo) return null;
  const filas: FilaMatriz[] = [
    ...comparativo.filas.map((fila): FilaMatriz => ({ tipo: "CONCEPTO", fila })),
    { tipo: "TOTAL" },
  ];
  return (
    <SectionCard
      titulo={`Comparativo por concepto · ronda ${comparativo.ronda}`}
      sinPadding
      extra={
        rondas.length > 1 ? (
          <SegmentedControl
            etiqueta="Ronda del comparativo"
            opciones={rondas.map((n) => ({ valor: String(n), etiqueta: `Ronda ${n}` }))}
            valor={String(comparativo.ronda)}
            onChange={(v) => setElegida(Number(v))}
            className={SOLO_44}
          />
        ) : undefined
      }
    >
      {comparativo.proveedorIds.length === 0 ? (
        <p className="p-4 text-sm text-brand-text-muted">
          Aún no hay respuestas con precios de proveedores en competencia.
        </p>
      ) : (
        <DataTable columns={columnas(comparativo, proveedores)} data={filas} />
      )}
    </SectionCard>
  );
}
