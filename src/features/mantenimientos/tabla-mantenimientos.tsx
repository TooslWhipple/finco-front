"use client";

import { useMemo } from "react";
import { Wrench } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, EmptyState, StatusChip } from "@/components/shared";
import {
  DEMO_TODAY,
  estaAtrasado,
  ETIQUETA_CATEGORIA_MANTENIMIENTO,
  type Mantenimiento,
} from "@/domain";
import { formatFecha, formatMoneda } from "@/lib/format";
import type { ContextoMantenimiento } from "./contexto";

interface TablaMantenimientosProps {
  mantenimientos: Mantenimiento[];
  contexto: ContextoMantenimiento;
  /** Las columnas de plaza y local se ocultan cuando el filtro ya las fija. */
  filtro?: { plazaId?: string; localId?: string };
  /** Versión para una ficha: sin proveedor, fecha de fin ni cargo. */
  compacta?: boolean;
  tamanoPagina?: number;
  onSeleccionar: (m: Mantenimiento) => void;
  vacio?: string;
}

const FECHA_VACIA = "—";

/** Tabla de mantenimientos; una sola para la vista global, la plaza y el local. */
export function TablaMantenimientos({
  mantenimientos,
  contexto,
  filtro = {},
  compacta = false,
  tamanoPagina = 12,
  onSeleccionar,
  vacio = "Sin mantenimientos con estos filtros",
}: TablaMantenimientosProps) {
  const columnas = useMemo<ColumnDef<Mantenimiento>[]>(() => {
    const todas: (ColumnDef<Mantenimiento> | false)[] = [
      {
        id: "folio",
        header: "Folio",
        accessorFn: (m) => m.folio,
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap text-brand-primary">
            {row.original.folio}
          </span>
        ),
      },
      {
        id: "estatus",
        header: "Estatus",
        accessorFn: (m) => m.estatus,
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-1">
            <StatusChip estatus={row.original.estatus} />
            {estaAtrasado(row.original, DEMO_TODAY) ? (
              <StatusChip estatus="ATRASADO" />
            ) : null}
          </span>
        ),
      },
      {
        id: "mantenimiento",
        header: "Mantenimiento",
        accessorFn: (m) => m.titulo,
        cell: ({ row }) => (
          <span className="block min-w-44">
            <span className="block font-medium">{row.original.titulo}</span>
            <span className="block text-xs text-brand-text-muted">
              {ETIQUETA_CATEGORIA_MANTENIMIENTO[row.original.categoria]}
            </span>
          </span>
        ),
      },
      filtro.plazaId === undefined && {
        id: "plaza",
        header: "Plaza",
        accessorFn: (m) => contexto.nombrePlaza(m.plazaId),
      },
      filtro.localId === undefined && {
        id: "local",
        header: "Local",
        accessorFn: (m) => contexto.local(m.localId)?.codigo ?? "Áreas comunes",
      },
      {
        id: "tipo",
        header: "Tipo",
        accessorFn: (m) => m.tipo,
        cell: ({ row }) => <StatusChip estatus={row.original.tipo} />,
      },
      !compacta && {
        id: "proveedor",
        header: "Proveedor",
        accessorFn: (m) => contexto.proveedor(m.proveedorId)?.nombre ?? m.proveedorId,
        cell: ({ row }) => (
          <span className="block min-w-40">
            {contexto.proveedor(row.original.proveedorId)?.nombre}
          </span>
        ),
      },
      {
        id: "inicio",
        header: "Fecha inicio",
        accessorFn: (m) => m.fechaInicio ?? "",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.fechaInicio
              ? formatFecha(row.original.fechaInicio)
              : `Prog. ${formatFecha(row.original.fechaProgramada)}`}
          </span>
        ),
      },
      !compacta && {
        id: "fin",
        header: "Fecha fin",
        accessorFn: (m) => m.fechaFin ?? "",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.fechaFin ? formatFecha(row.original.fechaFin) : FECHA_VACIA}
          </span>
        ),
      },
      {
        id: "costo",
        header: "Costo",
        accessorFn: (m) => m.costoReal ?? m.costoEstimado,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {row.original.costoReal !== undefined
              ? formatMoneda(row.original.costoReal)
              : `${formatMoneda(row.original.costoEstimado)} est.`}
          </span>
        ),
      },
      !compacta && {
        id: "cargo",
        header: "Cargo a",
        accessorFn: (m) => m.cargoA,
        cell: ({ row }) => (row.original.cargoA === "PLAZA" ? "Plaza" : "Locatario"),
      },
    ];
    return todas.filter((c): c is ColumnDef<Mantenimiento> => c !== false);
  }, [contexto, filtro.plazaId, filtro.localId, compacta]);

  return (
    <DataTable
      columns={columnas}
      data={mantenimientos}
      tamanoPagina={tamanoPagina}
      onFilaClick={onSeleccionar}
      vacio={
        <EmptyState
          icono={Wrench}
          titulo={vacio}
          descripcion="Cuando haya mantenimientos aparecerán aquí."
          className="py-8"
        />
      }
    />
  );
}
