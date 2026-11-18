"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Megaphone, Pencil, Plus } from "lucide-react";
import {
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  ETIQUETA_ORIGEN_PROSPECTO,
  estadisticaCampanas,
  NOTA_ATRIBUCION_DEMO,
  type Campana,
  type EstadisticaCampana,
} from "@/domain";
import {
  useAtribucionContratos,
  useCampanas,
  useContratosVivos,
  useProspectos,
  useSesion,
  useTodasLasCotizaciones,
} from "@/hooks";
import { formatFecha, formatMoneda, formatNumero, formatPorcentaje } from "@/lib/format";
import { DialogoCampana } from "./dialogo-campana";

interface FilaCampana extends EstadisticaCampana {
  campana: Campana;
}

/** Cociente que puede faltar (divisor 0): "—" en vez de un número. */
function textoOpcional(valor: number | null, formato: (v: number) => string): string {
  return valor === null ? "—" : formato(valor);
}

function vigencia(c: Campana): string {
  return c.fin
    ? `${formatFecha(c.inicio)} – ${formatFecha(c.fin)}`
    : `Desde ${formatFecha(c.inicio)}`;
}

/** Catálogo de campañas con su estadística: inversión, prospectos, contratos y costos. */
export function Campanas() {
  const { rol } = useSesion();
  const campanas = useCampanas();
  const prospectos = useProspectos().datos;
  const cotizaciones = useTodasLasCotizaciones();
  const contratos = useContratosVivos().datos;
  const atribucion = useAtribucionContratos();
  const puedeGestionar = can(rol, "campanas.gestionar");

  const [creando, setCreando] = useState(false);
  // El id se conserva al cerrar para que el diálogo no cambie de contenido mientras se va.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editarAbierto, setEditarAbierto] = useState(false);

  const filas = useMemo<FilaCampana[]>(() => {
    const porId = new Map(campanas.map((c) => [c.id, c]));
    return estadisticaCampanas(
      campanas,
      prospectos,
      cotizaciones,
      contratos ?? [],
      atribucion,
    ).flatMap((e) => {
      const campana = porId.get(e.campanaId);
      return campana ? [{ ...e, campana }] : [];
    });
  }, [campanas, prospectos, cotizaciones, contratos, atribucion]);
  const editando = filas.find((f) => f.campanaId === editandoId);

  const totales = useMemo(() => {
    const suma = (campo: "inversion" | "prospectos" | "contratos" | "rentaCerrada") =>
      filas.reduce((s, f) => s + f[campo], 0);
    const inversion = suma("inversion");
    const contratosTotales = suma("contratos");
    return {
      inversion,
      prospectos: suma("prospectos"),
      contratos: contratosTotales,
      rentaCerrada: suma("rentaCerrada"),
      costoPorContrato: contratosTotales === 0 ? null : inversion / contratosTotales,
    };
  }, [filas]);

  const columnas = useMemo<ColumnDef<FilaCampana>[]>(
    () => [
      {
        id: "campana",
        header: "Campaña",
        accessorFn: (f) => f.campana.nombre,
        cell: ({ row }) => (
          <span className="block">
            <span className="block font-medium">{row.original.campana.nombre}</span>
            <span className="block text-xs text-brand-text-muted">
              {ETIQUETA_ORIGEN_PROSPECTO[row.original.campana.canal]} ·{" "}
              {vigencia(row.original.campana)}
            </span>
          </span>
        ),
      },
      {
        id: "inversion",
        header: "Inversión",
        accessorFn: (f) => f.inversion,
        cell: ({ row }) => formatMoneda(row.original.inversion),
      },
      {
        id: "prospectos",
        header: "Prospectos",
        accessorFn: (f) => f.prospectos,
        cell: ({ row }) => formatNumero(row.original.prospectos),
      },
      {
        id: "contratos",
        header: "Contratos",
        accessorFn: (f) => f.contratos,
        cell: ({ row }) => formatNumero(row.original.contratos),
      },
      {
        id: "conversion",
        header: "Conversión",
        accessorFn: (f) => f.conversion ?? -1,
        cell: ({ row }) => textoOpcional(row.original.conversion, formatPorcentaje),
      },
      {
        id: "renta",
        header: "Renta cerrada",
        accessorFn: (f) => f.rentaCerrada,
        cell: ({ row }) => formatMoneda(row.original.rentaCerrada),
      },
      {
        id: "costoProspecto",
        header: "Costo por prospecto",
        accessorFn: (f) => f.costoPorProspecto ?? -1,
        cell: ({ row }) => textoOpcional(row.original.costoPorProspecto, formatMoneda),
      },
      {
        id: "costoContrato",
        header: "Costo por contrato",
        accessorFn: (f) => f.costoPorContrato ?? -1,
        cell: ({ row }) => textoOpcional(row.original.costoPorContrato, formatMoneda),
      },
      ...(puedeGestionar
        ? [
            {
              id: "acciones",
              header: "",
              enableSorting: false,
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${row.original.campana.nombre}`}
                  onClick={() => {
                    setEditandoId(row.original.campanaId);
                    setEditarAbierto(true);
                  }}
                >
                  <Pencil aria-hidden />
                  Editar
                </Button>
              ),
            } satisfies ColumnDef<FilaCampana>,
          ]
        : []),
    ],
    [puedeGestionar],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Campañas"
        descripcion="Campañas comerciales y lo que generan: prospectos, contratos, renta cerrada y cuánto cuesta cada uno."
        acciones={
          puedeGestionar ? (
            <Button
              onClick={() => setCreando(true)}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              <Plus aria-hidden />
              Nueva campaña
            </Button>
          ) : undefined
        }
      />
      <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
        {NOTA_ATRIBUCION_DEMO}
      </p>

      <KpiRow>
        <KpiCard etiqueta="Inversión" valor={formatMoneda(totales.inversion)} />
        <KpiCard etiqueta="Prospectos" valor={formatNumero(totales.prospectos)} />
        <KpiCard etiqueta="Contratos" valor={formatNumero(totales.contratos)} />
        <KpiCard
          etiqueta="Costo por contrato"
          valor={textoOpcional(totales.costoPorContrato, formatMoneda)}
          subtexto={`Renta cerrada ${formatMoneda(totales.rentaCerrada)}`}
        />
      </KpiRow>

      <SectionCard sinPadding>
        <DataTable
          columns={columnas}
          data={filas}
          ocultarEnVertical={["renta", "costoProspecto"]}
          vacio={
            <EmptyState
              icono={Megaphone}
              titulo="Sin campañas"
              descripcion="Da de alta una campaña para medir los prospectos que genera."
            />
          }
        />
      </SectionCard>

      {puedeGestionar ? (
        <>
          <DialogoCampana abierto={creando} onCambioAbierto={setCreando} />
          {editando ? (
            <DialogoCampana
              abierto={editarAbierto}
              onCambioAbierto={setEditarAbierto}
              campana={editando.campana}
              canalBloqueado={editando.prospectos > 0}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
