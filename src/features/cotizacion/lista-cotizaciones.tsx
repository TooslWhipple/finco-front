"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import {
  DataTable,
  EmptyState,
  MoneyAmount,
  PageHeader,
  SectionCard,
  StatusChip,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import type { Cotizacion } from "@/domain";
import {
  useCotizaciones,
  useExcepciones,
  useLocales,
  usePlazas,
  useSesion,
} from "@/hooks";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { estadoVisible, type EstadoVisible } from "./calculos";

interface Fila {
  cotizacion: Cotizacion;
  localCodigo: string;
  plaza: string;
  /** El mismo estado que muestra el detalle (excepción abierta o aplicada, contrato). */
  estado: EstadoVisible;
}

export function ListaCotizaciones() {
  const router = useRouter();
  const { rol } = useSesion();
  const cotizaciones = useCotizaciones();
  const excepciones = useExcepciones();
  const locales = useLocales().datos;
  const plazas = usePlazas().datos;

  const filas = useMemo<Fila[]>(() => {
    const porLocal = new Map(locales?.map((l) => [l.id, l]));
    const nombrePlaza = new Map(plazas?.map((p) => [p.id, p.nombre]));
    return [...cotizaciones]
      .sort((a, b) => b.id.localeCompare(a.id))
      .map((cotizacion) => {
        const local = porLocal.get(cotizacion.localId);
        return {
          cotizacion,
          localCodigo: local?.codigo ?? cotizacion.localId,
          plaza: (local && nombrePlaza.get(local.plazaId)) ?? "—",
          estado: estadoVisible(cotizacion, local, excepciones),
        };
      });
  }, [cotizaciones, excepciones, locales, plazas]);

  const columnas = useMemo<ColumnDef<Fila>[]>(
    () => [
      {
        id: "folio",
        header: "Folio",
        accessorFn: (f) => f.cotizacion.id,
        cell: ({ row }) => (
          <Link
            href={`/cotizaciones/${row.original.cotizacion.id}`}
            className="font-medium text-brand-primary hover:underline"
          >
            {row.original.cotizacion.id}
          </Link>
        ),
      },
      { id: "plaza", header: "Plaza", accessorFn: (f) => f.plaza },
      { id: "local", header: "Local", accessorFn: (f) => f.localCodigo },
      {
        id: "prospecto",
        header: "Prospecto",
        accessorFn: (f) => f.cotizacion.prospecto.nombre,
      },
      {
        id: "renta",
        header: "Renta",
        accessorFn: (f) => f.cotizacion.rentaMensual,
        cell: ({ row }) => <MoneyAmount valor={row.original.cotizacion.rentaMensual} />,
      },
      {
        id: "vigencia",
        header: "Vigente hasta",
        accessorFn: (f) => f.cotizacion.vigenteHasta,
        cell: ({ row }) => formatFecha(row.original.cotizacion.vigenteHasta),
      },
      {
        id: "estado",
        header: "Estado",
        accessorFn: (f) => f.estado.etiqueta ?? f.estado.estatus,
        cell: ({ row }) => <StatusChip {...row.original.estado} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Cotizaciones"
        descripcion={`${cotizaciones.length} cotizaciones en seguimiento.`}
        acciones={
          can(rol, "cotizaciones.crear") ? (
            <Link
              href="/cotizaciones/nueva"
              className={cn(
                buttonVariants(),
                "bg-brand-cta text-white hover:bg-brand-cta-light",
              )}
            >
              + Nueva cotización
            </Link>
          ) : undefined
        }
      />
      <SectionCard sinPadding>
        <DataTable
          columns={columnas}
          data={filas}
          tamanoPagina={12}
          ocultarEnVertical={["plaza", "vigencia"]}
          onFilaClick={(f) => router.push(`/cotizaciones/${f.cotizacion.id}`)}
          vacio={
            <EmptyState
              icono={FileText}
              titulo="Aún no hay cotizaciones"
              descripcion="Cotiza desde el plano de una plaza."
            />
          }
        />
      </SectionCard>
    </div>
  );
}
