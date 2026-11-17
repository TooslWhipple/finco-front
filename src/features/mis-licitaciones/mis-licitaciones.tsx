"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList } from "lucide-react";
import {
  DataTable,
  EmptyState,
  MoneyAmount,
  PageHeader,
  SectionCard,
  StatusChip,
  type Estatus,
} from "@/components/shared";
import { can } from "@/config/permissions";
import {
  estadoEnPortal,
  ETIQUETA_PARTIDA,
  rondaAbierta,
  type EstadoEnPortal,
  type Licitacion,
} from "@/domain";
import { useMisLicitaciones, useSesion } from "@/hooks";

/** Chip de cada estado del portal: reusa los estatus existentes con su etiqueta. */
export const CHIP_ESTADO_PORTAL: Readonly<
  Record<EstadoEnPortal, { estatus: Estatus; etiqueta: string }>
> = {
  POR_RESPONDER: { estatus: "PENDIENTE", etiqueta: "Por responder" },
  RESPONDIDA: { estatus: "ENVIADA", etiqueta: "Respondida" },
  RONDA_CERRADA: { estatus: "CERRADA", etiqueta: "Ronda cerrada" },
  FUERA: { estatus: "SIN_RESPUESTA", etiqueta: "Fuera de esta ronda" },
};

interface FilaInvitacion {
  licitacion: Licitacion;
  ronda?: number;
  estado: EstadoEnPortal;
  /** Total de la propuesta del proveedor en la ronda abierta. */
  propuesta?: number;
}

const COLUMNAS: ColumnDef<FilaInvitacion>[] = [
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
          {ETIQUETA_PARTIDA[row.original.licitacion.partida]} ·{" "}
          {row.original.licitacion.conceptos.length} conceptos
        </span>
      </span>
    ),
  },
  {
    id: "ronda",
    header: "Ronda",
    accessorFn: (f) => f.ronda ?? 0,
    cell: ({ row }) =>
      row.original.ronda === undefined ? "—" : `Ronda ${row.original.ronda}`,
  },
  {
    id: "estado",
    header: "Estado",
    accessorFn: (f) => f.estado,
    cell: ({ row }) => <StatusChip {...CHIP_ESTADO_PORTAL[row.original.estado]} />,
  },
  {
    id: "propuesta",
    header: "Tu propuesta",
    accessorFn: (f) => f.propuesta ?? 0,
    cell: ({ row }) =>
      row.original.propuesta === undefined ? (
        <span className="text-brand-text-muted">—</span>
      ) : (
        <MoneyAmount valor={row.original.propuesta} />
      ),
  },
];

/** Portal del contratista: las licitaciones en curso a las que lo invitaron. */
export function MisLicitaciones() {
  const router = useRouter();
  const { usuario, rol } = useSesion();
  const proveedorId = usuario?.proveedorId;
  const licitaciones = useMisLicitaciones(proveedorId);
  const filas = useMemo(
    () =>
      proveedorId
        ? licitaciones.map((licitacion): FilaInvitacion => {
            const abierta = rondaAbierta(licitacion);
            const propia = abierta?.propuestas.find((p) => p.proveedorId === proveedorId);
            return {
              licitacion,
              ronda: abierta?.numero,
              estado: estadoEnPortal(licitacion, proveedorId),
              propuesta: propia?.respondio ? propia.monto : undefined,
            };
          })
        : [],
    [licitaciones, proveedorId],
  );

  if (!can(rol, "licitacion.responder") || !proveedorId) {
    return (
      <EmptyState
        icono={ClipboardList}
        titulo="Tu usuario no representa a un proveedor"
        descripcion="El portal de licitaciones es para los contratistas del padrón."
        className="py-24"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mis licitaciones"
        descripcion="Responde con tu precio unitario por concepto mientras la ronda siga abierta."
      />
      <SectionCard titulo={`Invitaciones (${filas.length})`} sinPadding>
        <DataTable
          columns={COLUMNAS}
          data={filas}
          onFilaClick={(f) => router.push(`/mis-licitaciones/${f.licitacion.id}`)}
          vacio={
            <EmptyState
              icono={ClipboardList}
              titulo="Sin invitaciones por ahora"
              descripcion="Cuando Finco te mande un catálogo para cotizar, aparecerá aquí."
            />
          }
        />
      </SectionCard>
    </div>
  );
}
