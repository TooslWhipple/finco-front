"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  facturasDeMantenimiento,
  facturasSinLigar,
  uuidCorto,
  type FacturaSat,
  type Mantenimiento,
} from "@/domain";
import { useFacturasSat } from "@/hooks";
import { formatFecha, formatMoneda } from "@/lib/format";
import { useAppStore } from "@/store";
import { FileText } from "lucide-react";

/** Bandeja de CFDI recibidos de la plaza que aún no se ligan a un trabajo. */
function DialogoLigarFactura({
  mantenimiento,
  onCerrar,
}: {
  mantenimiento: Mantenimiento;
  onCerrar: () => void;
}) {
  const facturas = useFacturasSat();
  const ligar = useAppStore((s) => s.ligarFacturaSat);
  const libres = useMemo(
    () => facturasSinLigar(facturas, mantenimiento.plazaId),
    [facturas, mantenimiento.plazaId],
  );
  const columnas = useMemo<ColumnDef<FacturaSat>[]>(
    () => [
      {
        id: "emisor",
        header: "Emisor",
        accessorFn: (f) => f.emisor,
        cell: ({ row }) => (
          <span className="block min-w-36">
            <span className="block font-medium">{row.original.emisor}</span>
            <span className="block text-xs text-brand-text-muted">
              {row.original.concepto}
            </span>
          </span>
        ),
      },
      {
        id: "uuid",
        header: "UUID",
        accessorFn: (f) => f.uuid,
        cell: ({ row }) => (
          <span className="font-mono text-xs whitespace-nowrap">
            {uuidCorto(row.original.uuid)}
          </span>
        ),
      },
      {
        id: "fecha",
        header: "Fecha",
        accessorFn: (f) => f.fecha,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatFecha(row.original.fecha)}</span>
        ),
      },
      {
        id: "total",
        header: "Total",
        accessorFn: (f) => f.total,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatMoneda(row.original.total)}
          </span>
        ),
      },
      {
        id: "accion",
        header: () => <span className="sr-only">Acción</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            className="h-11 bg-brand-cta text-white hover:bg-brand-cta-light"
            aria-label={`Ligar factura ${uuidCorto(row.original.uuid)}`}
            onClick={() => {
              ligar(row.original.id, mantenimiento.id);
              toast.success(
                `Factura ${uuidCorto(row.original.uuid)} ligada a ${mantenimiento.folio}`,
              );
              onCerrar();
            }}
          >
            Ligar
          </Button>
        ),
      },
    ],
    [ligar, mantenimiento.id, mantenimiento.folio, onCerrar],
  );
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ligar factura SAT</DialogTitle>
          <DialogDescription>
            CFDI recibidos de la plaza sin ligar. {mantenimiento.folio} cuesta{" "}
            {formatMoneda(mantenimiento.costoReal ?? mantenimiento.costoEstimado)}.
            Facturas simuladas.
          </DialogDescription>
        </DialogHeader>
        <DataTable
          columns={columnas}
          data={libres}
          vacio={
            <EmptyState
              icono={FileText}
              titulo="Sin facturas por ligar"
              descripcion="Todas las facturas recibidas de esta plaza ya están ligadas."
              className="py-8"
            />
          }
        />
      </DialogContent>
    </Dialog>
  );
}

/** Sección "Facturas" del detalle: CFDI ligadas al trabajo y el acceso a la bandeja. */
export function SeccionFacturas({
  mantenimiento,
  puedeLigar,
}: {
  mantenimiento: Mantenimiento;
  puedeLigar: boolean;
}) {
  const facturas = useFacturasSat();
  const desligar = useAppStore((s) => s.desligarFacturaSat);
  const [ligando, setLigando] = useState(false);
  const ligadas = useMemo(
    () => facturasDeMantenimiento(facturas, mantenimiento.id),
    [facturas, mantenimiento.id],
  );
  const facturado = ligadas.reduce((suma, f) => suma + f.total, 0);
  return (
    <div className="space-y-3">
      {ligadas.length === 0 ? (
        <p className="text-brand-text-muted">Sin facturas ligadas.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {ligadas.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-brand-line p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{f.emisor}</p>
                  <p className="text-xs text-brand-text-muted">
                    UUID {uuidCorto(f.uuid)} · {f.rfcEmisor} · {formatFecha(f.fecha)}
                  </p>
                  <p className="text-xs text-brand-text-muted">{f.concepto}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-medium tabular-nums">
                    {formatMoneda(f.total)}
                  </span>
                  {puedeLigar ? (
                    <Button
                      variant="outline"
                      className="h-11"
                      aria-label={`Desligar factura ${uuidCorto(f.uuid)}`}
                      onClick={() => {
                        desligar(f.id);
                        toast.success(
                          `Factura ${uuidCorto(f.uuid)} regresó a la bandeja`,
                        );
                      }}
                    >
                      Desligar
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-brand-text-muted">
            Facturado {formatMoneda(facturado)} de{" "}
            {formatMoneda(mantenimiento.costoReal ?? mantenimiento.costoEstimado)}
          </p>
        </>
      )}
      {puedeLigar ? (
        <Button variant="outline" className="h-11" onClick={() => setLigando(true)}>
          Ligar factura
        </Button>
      ) : null}
      {ligando ? (
        <DialogoLigarFactura
          mantenimiento={mantenimiento}
          onCerrar={() => setLigando(false)}
        />
      ) : null}
    </div>
  );
}
