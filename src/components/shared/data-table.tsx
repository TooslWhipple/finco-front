"use client";

import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  /** Filas por página; sin él se pinta todo. */
  tamanoPagina?: number;
  onFilaClick?: (fila: TData) => void;
  /** Contenido cuando no hay filas. */
  vacio?: ReactNode;
  className?: string;
  /**
   * Modo compacto de columnas fijas (`table-fixed`, 13 px, paddings chicos): ancho en
   * px por columna, `null` para la que absorbe el resto. Sin él, la tabla es automática.
   */
  anchos?: readonly (number | null)[];
}

export function DataTable<TData>({
  columns,
  data,
  tamanoPagina,
  onFilaClick,
  vacio,
  className,
  anchos,
}: DataTableProps<TData>) {
  // TanStack Table devuelve funciones no memoizables: se excluye del React Compiler.
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(tamanoPagina
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageIndex: 0, pageSize: tamanoPagina } },
        }
      : {}),
  });

  const filas = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = data.length;

  return (
    <div className={cn("w-full", className)}>
      <Table
        className={
          anchos ? "table-fixed text-[13px] [&_td]:px-1.5 [&_th]:px-1.5" : undefined
        }
      >
        {anchos ? (
          <colgroup>
            {anchos.map((ancho, i) => (
              <col key={i} style={ancho === null ? undefined : { width: ancho }} />
            ))}
          </colgroup>
        ) : null}
        <TableHeader>
          {table.getHeaderGroups().map((grupo) => (
            <TableRow key={grupo.id}>
              {grupo.headers.map((h) => {
                const ordenable = h.column.getCanSort();
                const orden = h.column.getIsSorted();
                return (
                  <TableHead
                    key={h.id}
                    className="text-xs font-medium tracking-wide text-brand-text-muted uppercase"
                  >
                    {h.isPlaceholder ? null : ordenable ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 uppercase hover:text-brand-primary"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {orden === "asc" ? (
                          <ArrowUp className="size-3" aria-label="orden ascendente" />
                        ) : orden === "desc" ? (
                          <ArrowDown className="size-3" aria-label="orden descendente" />
                        ) : null}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                {vacio}
              </TableCell>
            </TableRow>
          ) : (
            filas.map((fila) => (
              <TableRow
                key={fila.id}
                onClick={onFilaClick ? () => onFilaClick(fila.original) : undefined}
                className={onFilaClick ? "cursor-pointer" : undefined}
              >
                {fila.getVisibleCells().map((celda) => (
                  <TableCell key={celda.id}>
                    {flexRender(celda.column.columnDef.cell, celda.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {tamanoPagina && total > 0 ? (
        <div className="flex items-center justify-between gap-3 px-2 pt-3 text-sm text-brand-text-muted">
          <span>
            {formatNumero(pageIndex * pageSize + 1)}–
            {formatNumero(Math.min((pageIndex + 1) * pageSize, total))} de{" "}
            {formatNumero(total)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Página anterior"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Página siguiente"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
