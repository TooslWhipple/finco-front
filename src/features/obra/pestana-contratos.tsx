"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BarraProgreso,
  DataTable,
  MoneyAmount,
  PanelDetalle,
  SectionCard,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  ETIQUETA_PARTIDA,
  ETIQUETA_UNIDAD,
  importeConcepto,
  montoContrato,
  type ConceptoObra,
} from "@/domain";
import { formatFecha, formatNumero, formatPorcentaje } from "@/lib/format";
import { cn } from "@/lib/utils";
import { filasContratos, type FilaContrato } from "./agregados";
import type { ContextoExpediente } from "./contexto";

const ANCHOS_CONCEPTOS = [58, null, 42, 68, 84, 92] as const;

const COLUMNAS_CONCEPTOS: ColumnDef<ConceptoObra>[] = [
  { id: "clave", header: "Clave", accessorFn: (c) => c.clave },
  {
    id: "descripcion",
    header: "Concepto",
    accessorFn: (c) => c.descripcion,
    cell: ({ row }) => (
      <span className="block truncate" title={row.original.descripcion}>
        {row.original.descripcion}
      </span>
    ),
  },
  { id: "unidad", header: "Un.", accessorFn: (c) => ETIQUETA_UNIDAD[c.unidad] },
  {
    id: "volumen",
    header: "Volumen",
    accessorFn: (c) => c.volumenContratado,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumero(row.original.volumenContratado)}</span>
    ),
  },
  {
    id: "pu",
    header: "P. unit.",
    accessorFn: (c) => c.precioUnitario,
    cell: ({ row }) => <MoneyAmount valor={row.original.precioUnitario} />,
  },
  {
    id: "importe",
    header: "Importe",
    accessorFn: (c) => importeConcepto(c),
    cell: ({ row }) => <MoneyAmount valor={importeConcepto(row.original)} />,
  },
];

const COLUMNAS_CONTRATOS: ColumnDef<FilaContrato>[] = [
  {
    id: "contrato",
    header: "Contrato",
    accessorFn: (f) => f.contrato.folio,
    cell: ({ row }) => (
      <span className="block">
        <span className="block font-medium text-brand-primary">
          {row.original.contrato.folio}
        </span>
        <span className="block text-xs text-brand-text-muted">
          {ETIQUETA_PARTIDA[row.original.contrato.partida]}
        </span>
      </span>
    ),
  },
  { id: "contratista", header: "Contratista", accessorFn: (f) => f.contrato.contratista },
  {
    id: "monto",
    header: "Monto",
    accessorFn: (f) => f.monto,
    cell: ({ row }) => <MoneyAmount valor={row.original.monto} />,
  },
  {
    id: "fechas",
    header: "Fechas planeadas",
    accessorFn: (f) => f.contrato.inicioPlan,
    cell: ({ row }) =>
      `${formatFecha(row.original.contrato.inicioPlan)} – ${formatFecha(row.original.contrato.finPlan)}`,
  },
  {
    id: "avance",
    header: "Avance planeado",
    accessorFn: (f) => f.avancePlaneado,
    cell: ({ row }) => (
      <span className="block min-w-28 space-y-1">
        <span className="block text-xs tabular-nums">
          {formatPorcentaje(row.original.avancePlaneado)}
        </span>
        <BarraProgreso
          valor={row.original.avancePlaneado}
          etiqueta={`Avance planeado de ${row.original.contrato.folio}`}
        />
      </span>
    ),
  },
];

/** Tabla de contratos del proyecto; al elegir uno se abre su presupuesto por conceptos. */
export function PestanaContratos({
  contratos,
  licitaciones,
  abrirLicitacion,
  hoy,
}: ContextoExpediente) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const filas = useMemo(() => filasContratos(contratos, hoy), [contratos, hoy]);
  const seleccionado = contratos.find((c) => c.id === seleccionadoId);
  const licitacion = licitaciones.find((l) => l.contratoObraId === seleccionado?.id);

  return (
    <div
      className={cn(
        "grid items-start gap-6",
        seleccionado && "xl:grid-cols-[minmax(0,1fr)_34rem]",
      )}
    >
      <SectionCard titulo={`Contratos de obra (${filas.length})`} className="min-w-0">
        <DataTable
          columns={COLUMNAS_CONTRATOS}
          data={filas}
          onFilaClick={(f) => setSeleccionadoId(f.contrato.id)}
        />
      </SectionCard>
      {seleccionado ? (
        <PanelDetalle
          titulo={seleccionado.folio}
          subtitulo={`${ETIQUETA_PARTIDA[seleccionado.partida]} · ${seleccionado.contratista}`}
          onCerrar={() => setSeleccionadoId(null)}
          acciones={
            licitacion ? (
              <Button variant="outline" onClick={() => abrirLicitacion(licitacion.id)}>
                Ver licitación
              </Button>
            ) : undefined
          }
          secciones={[
            {
              titulo: "Conceptos del presupuesto",
              contenido: (
                <div className="space-y-3">
                  <DataTable
                    columns={COLUMNAS_CONCEPTOS}
                    data={seleccionado.conceptos}
                    anchos={ANCHOS_CONCEPTOS}
                  />
                  <p className="flex items-center justify-between border-t border-brand-line pt-3 font-semibold">
                    <span>Total del contrato</span>
                    <MoneyAmount valor={montoContrato(seleccionado)} />
                  </p>
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
