"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft } from "lucide-react";
import { DataTable, MoneyAmount, SectionCard, StatusChip } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { PROVEEDORES_OBRA } from "@/data/licitaciones";
import { ETIQUETA_PARTIDA } from "@/domain";
import type { ContextoExpediente } from "../contexto";
import { AccionesLicitacion } from "./acciones-licitacion";
import { ESTADO_LICITACION, filasLicitaciones, type FilaLicitacion } from "./agregados";
import { DetalleLicitacion } from "./detalle-licitacion";

const SIN_DATO = <span className="text-brand-text-muted">—</span>;

const COLUMNAS: ColumnDef<FilaLicitacion>[] = [
  {
    id: "licitacion",
    header: "Licitación",
    accessorFn: (f) => f.licitacion.folio,
    cell: ({ row }) => (
      <span className="block">
        <span className="block font-medium text-brand-primary">
          {row.original.licitacion.folio}
        </span>
        <span className="block text-xs text-brand-text-muted">
          {ETIQUETA_PARTIDA[row.original.licitacion.partida]}
        </span>
      </span>
    ),
  },
  {
    id: "respuestas",
    header: "Invitados / respuestas",
    accessorFn: (f) => f.respuesta.respondieron,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.respuesta.invitados} / {row.original.respuesta.respondieron}
      </span>
    ),
  },
  {
    id: "estado",
    header: "Estado",
    accessorFn: (f) => f.licitacion.estado,
    cell: ({ row }) => {
      const { estatus, etiqueta } = ESTADO_LICITACION[row.original.licitacion.estado];
      return <StatusChip estatus={estatus} etiqueta={etiqueta} />;
    },
  },
  { id: "ganador", header: "Ganador", accessorFn: (f) => f.ganador ?? "—" },
  {
    id: "adjudicado",
    header: "Adjudicado",
    accessorFn: (f) => f.adjudicado ?? 0,
    cell: ({ row }) =>
      row.original.adjudicado === undefined ? (
        SIN_DATO
      ) : (
        <MoneyAmount valor={row.original.adjudicado} />
      ),
  },
  {
    id: "base",
    header: "Base",
    accessorFn: (f) => f.licitacion.presupuestoBase,
    cell: ({ row }) => <MoneyAmount valor={row.original.licitacion.presupuestoBase} />,
  },
  {
    id: "ahorro",
    header: "Ahorro",
    accessorFn: (f) => f.ahorro ?? 0,
    cell: ({ row }) =>
      row.original.ahorro === undefined ? (
        SIN_DATO
      ) : (
        <MoneyAmount valor={row.original.ahorro} />
      ),
  },
];

/** Licitaciones del proyecto: lista y, al elegir una, su historial de rondas y decisión. */
export function PestanaLicitaciones({
  licitaciones,
  licitacionEnfocadaId,
  rol,
}: ContextoExpediente) {
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(
    licitacionEnfocadaId,
  );
  const filas = useMemo(
    () => filasLicitaciones(licitaciones, PROVEEDORES_OBRA),
    [licitaciones],
  );
  const seleccionada = licitaciones.find((l) => l.id === seleccionadaId);

  if (!seleccionada) {
    return (
      <SectionCard titulo={`Licitaciones (${filas.length})`}>
        <DataTable
          columns={COLUMNAS}
          data={filas}
          onFilaClick={(f) => setSeleccionadaId(f.licitacion.id)}
        />
      </SectionCard>
    );
  }

  const { estatus, etiqueta } = ESTADO_LICITACION[seleccionada.estado];
  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => setSeleccionadaId(null)}>
        <ArrowLeft aria-hidden className="size-4" />
        Todas las licitaciones
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-3 font-heading text-xl font-bold text-brand-primary">
            {seleccionada.folio} · {ETIQUETA_PARTIDA[seleccionada.partida]}
            <StatusChip estatus={estatus} etiqueta={etiqueta} />
          </h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            {seleccionada.invitados.length} proveedores invitados ·{" "}
            {seleccionada.rondas.length} rondas
          </p>
        </div>
        <AccionesLicitacion
          licitacion={seleccionada}
          proveedores={PROVEEDORES_OBRA}
          rol={rol}
        />
      </header>
      <DetalleLicitacion licitacion={seleccionada} proveedores={PROVEEDORES_OBRA} />
    </div>
  );
}
