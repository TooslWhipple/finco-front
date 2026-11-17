"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MessageCircle, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { DEMO_TODAY, nombreLocatario, type ClienteMoroso } from "@/domain";
import { DataTable, EmptyState, MoneyAmount, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { useFuentesLocatario, useSesion } from "@/hooks";
import { formatDiaMes, formatNumero } from "@/lib/format";
import { useAppStore } from "@/store";
import { ChipAtraso } from "./chip-atraso";

/** Morosos por página. */
const FILAS_MOROSOS = 8;

interface ClientesMorososProps {
  /** Morosos ya calculados con `clientesMorosos`. */
  morosos: readonly ClienteMoroso[];
  /**
   * Oculta las acciones (para tableros de solo lectura). El panel no enlaza a
   * `/cobranza`: dentro de Cobranza sería un enlace a sí misma.
   */
  soloLectura?: boolean;
}

interface FilaMoroso {
  moroso: ClienteMoroso;
  nombre: string;
}

/**
 * Panel "Clientes que se demoran": todos los morosos con su atraso máximo
 * (escalonado con `nivelAtraso`), sus rentas vencidas y su saldo sin pagar
 * (rentas y recargos, vencidos o no).
 */
export function ClientesMorosos({ morosos, soloLectura = false }: ClientesMorososProps) {
  const { rol } = useSesion();
  const fuentesLocatario = useFuentesLocatario();
  const registrarSeguimiento = useAppStore((s) => s.registrarSeguimiento);

  const conAcciones = !soloLectura && can(rol, "cobranza.gestionar");

  const filas = useMemo<FilaMoroso[]>(
    () =>
      morosos.map((moroso) => ({
        moroso,
        nombre: nombreLocatario(moroso.locatarioId, fuentesLocatario),
      })),
    [morosos, fuentesLocatario],
  );

  const columnas = useMemo<ColumnDef<FilaMoroso>[]>(() => {
    const recordar = ({ moroso, nombre }: FilaMoroso) => {
      for (const id of moroso.facturaIds) {
        registrarSeguimiento(id, `Recordatorio enviado el ${formatDiaMes(DEMO_TODAY)}`);
      }
      toast.success(`Recordatorio registrado para ${nombre}`);
    };
    const base: ColumnDef<FilaMoroso>[] = [
      {
        id: "cliente",
        header: "Cliente",
        accessorFn: (f) => f.nombre,
        cell: ({ row }) => (
          <span className="font-medium text-brand-text">{row.original.nombre}</span>
        ),
      },
      {
        id: "rentas",
        header: "Rentas vencidas",
        accessorFn: (f) => f.moroso.facturaIds.length,
        cell: ({ row }) => formatNumero(row.original.moroso.facturaIds.length),
      },
      {
        id: "saldo",
        header: "Saldo sin pagar",
        accessorFn: (f) => f.moroso.saldo,
        cell: ({ row }) => <MoneyAmount valor={row.original.moroso.saldo} />,
      },
      {
        id: "atraso",
        header: "Atraso",
        accessorFn: (f) => f.moroso.dias,
        cell: ({ row }) => <ChipAtraso dias={row.original.moroso.dias} />,
      },
    ];
    if (!conAcciones) return base;
    return [
      ...base,
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => recordar(row.original)}
          >
            <MessageCircle aria-hidden />
            Recordar
          </Button>
        ),
      },
    ];
  }, [conAcciones, registrarSeguimiento]);

  return (
    <SectionCard
      titulo="Clientes que se demoran"
      extra={`${formatNumero(morosos.length)} clientes`}
      sinPadding
    >
      <DataTable
        columns={columnas}
        data={filas}
        tamanoPagina={FILAS_MOROSOS}
        ocultarEnVertical={["rentas"]}
        vacio={
          <EmptyState
            icono={UserCheck}
            titulo="Ningún cliente con atraso"
            descripcion="Todas las rentas vencidas están pagadas."
          />
        }
      />
    </SectionCard>
  );
}
