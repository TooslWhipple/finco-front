"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Calculator, FileSpreadsheet, GanttChart, History, Layers } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import type { EventoSync, IdIntegracion, Integracion } from "@/domain";
import {
  CardIntegracion,
  DataTable,
  EmptyState,
  PageHeader,
  PillsFiltro,
  SectionCard,
  StatusChip,
  type MetricaIntegracion,
  type OpcionPill,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { DialogoDiferencias } from "@/features/cobranza/dialogo-diferencias";
import {
  useEstadoIntegracion,
  useEventosSync,
  useFacturas,
  useIntegraciones,
  useSesion,
} from "@/hooks";
import { formatMoneda, formatNumero, formatPorcentaje } from "@/lib/format";
import { AHORA_DEMO, MES_DEMO, haceCuanto } from "@/lib/tiempo";
import { useAppStore } from "@/store";
import {
  eventosRecientes,
  registrosUltimoSync,
  type FiltroIntegracion,
} from "./agregados";

const MS_SINCRONIZACION = 1400;

const ICONO: Readonly<Record<IdIntegracion, ReactNode>> = {
  ENKONTROL: <Calculator className="size-5" />,
  EXCEL: <FileSpreadsheet className="size-5" />,
  MONDAY: <Layers className="size-5" />,
  MSPROJECT: <GanttChart className="size-5" />,
};

const DETALLE_SYNC_MANUAL: Readonly<Record<Exclude<IdIntegracion, "ENKONTROL">, string>> =
  {
    EXCEL: "Rent roll importado desde rent-roll-nov-2026.xlsx",
    MONDAY: "Tablero de proyectos actualizado",
    MSPROJECT: "Cronograma de obra importado desde cronograma-obra.mpp (simulado)",
  };

function ultimoSyncLegible(iso: string): string {
  return `${haceCuanto(iso)} (${iso.slice(0, 10)} ${iso.slice(11, 16)})`;
}

export function Integraciones() {
  const { rol } = useSesion();
  const integraciones = useIntegraciones().datos;
  const estadoEnKontrol = useEstadoIntegracion().datos;
  const eventos = useEventosSync();
  const facturas = useFacturas(MES_DEMO).datos;
  const registrarSync = useAppStore((s) => s.registrarSync);

  const [filtro, setFiltro] = useState<FiltroIntegracion>("TODAS");
  const [sincronizando, setSincronizando] = useState<IdIntegracion | null>(null);
  const [verDiferencias, setVerDiferencias] = useState(false);

  const puedeSincronizar = can(rol, "integraciones.sincronizar");
  const folios = useMemo(
    () => new Map((facturas ?? []).map((f) => [f.id, f.folio ?? f.id])),
    [facturas],
  );
  const diferencias = estadoEnKontrol?.diferencias ?? [];
  const montoDiferencias = diferencias.reduce((suma, d) => suma + d.monto, 0);

  useEffect(() => {
    if (!sincronizando) return;
    const id = setTimeout(() => {
      const registros = registrosUltimoSync(eventos, sincronizando);
      const conDiferencias = sincronizando === "ENKONTROL" && diferencias.length > 0;
      registrarSync({
        integracionId: sincronizando,
        fecha: AHORA_DEMO,
        resultado: conDiferencias ? "ADVERTENCIA" : "OK",
        detalle:
          sincronizando === "ENKONTROL"
            ? conDiferencias
              ? `${diferencias.length} diferencias de conciliación por ${formatMoneda(montoDiferencias)}`
              : "Sincronización manual desde Integraciones"
            : DETALLE_SYNC_MANUAL[sincronizando],
        registros,
      });
      toast.success("Sincronización completada");
      setSincronizando(null);
    }, MS_SINCRONIZACION);
    return () => clearTimeout(id);
  }, [sincronizando, eventos, diferencias.length, montoDiferencias, registrarSync]);

  const nombrePorId = useMemo(
    () => new Map((integraciones ?? []).map((i) => [i.id, i.nombre])),
    [integraciones],
  );

  const columnas = useMemo<ColumnDef<EventoSync>[]>(
    () => [
      {
        id: "fecha",
        header: "Fecha",
        accessorFn: (e) => e.fecha,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.fecha.slice(0, 10)} {row.original.fecha.slice(11, 16)}
          </span>
        ),
      },
      {
        id: "integracion",
        header: "Integración",
        accessorFn: (e) => nombrePorId.get(e.integracionId) ?? e.integracionId,
      },
      {
        id: "resultado",
        header: "Resultado",
        accessorFn: (e) => e.resultado,
        cell: ({ row }) => <StatusChip estatus={row.original.resultado} />,
      },
      { id: "detalle", header: "Detalle", accessorFn: (e) => e.detalle },
      {
        id: "registros",
        header: "Registros",
        accessorFn: (e) => e.registros,
        cell: ({ row }) => formatNumero(row.original.registros),
      },
    ],
    [nombrePorId],
  );

  const visibles = useMemo(() => eventosRecientes(eventos, filtro), [eventos, filtro]);
  const opciones: OpcionPill<FiltroIntegracion>[] = [
    { valor: "TODAS", etiqueta: "Todas", conteo: eventos.length },
    ...(integraciones ?? []).map((i) => ({
      valor: i.id,
      etiqueta: i.nombre,
      conteo: eventos.filter((e) => e.integracionId === i.id).length,
    })),
  ];

  const metricas = (i: Integracion): MetricaIntegracion[] =>
    i.id === "ENKONTROL" && estadoEnKontrol
      ? [
          {
            etiqueta: "Conciliación",
            valor: formatPorcentaje(estadoEnKontrol.conciliacion),
          },
          {
            etiqueta: "Facturas timbradas",
            valor: `${formatNumero(estadoEnKontrol.facturasTimbradas)} / ${formatNumero(estadoEnKontrol.facturasTotales)}`,
          },
          {
            etiqueta: "Pagos aplicados",
            valor: formatNumero(estadoEnKontrol.pagosAplicados),
          },
          {
            etiqueta: "Pólizas generadas",
            valor: formatNumero(estadoEnKontrol.polizasGeneradas),
          },
          {
            etiqueta: "Diferencias",
            valor: `${formatNumero(diferencias.length)} · ${formatMoneda(montoDiferencias)}`,
          },
        ]
      : i.metricas;

  const estadoDe = (i: Integracion): Integracion["estado"] =>
    i.id === "ENKONTROL" && estadoEnKontrol
      ? diferencias.length > 0
        ? "CON_DIFERENCIAS"
        : "CONECTADA"
      : i.estado;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Integraciones"
        descripcion="Conexiones con EnKontrol, Excel, Monday y MS Project: estado, último sync y bitácora."
      />
      {!puedeSincronizar ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Las sincronizaciones las lanzan Cobranza y Superadmin.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {(integraciones ?? []).map((i) => (
          <CardIntegracion
            key={i.id}
            nombre={i.nombre}
            descripcion={i.descripcion}
            icono={ICONO[i.id]}
            estado={<StatusChip estatus={estadoDe(i)} />}
            ultimoSync={ultimoSyncLegible(i.ultimoSync)}
            metricas={metricas(i)}
            sincronizando={sincronizando === i.id}
            onSincronizar={
              puedeSincronizar
                ? () => setSincronizando((actual) => actual ?? i.id)
                : undefined
            }
            pie={
              i.id === "ENKONTROL" ? (
                <Button
                  variant="link"
                  className="self-start px-0"
                  disabled={diferencias.length === 0}
                  onClick={() => setVerDiferencias(true)}
                >
                  Revisar diferencias
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>

      <SectionCard
        titulo="Bitácora de sincronización"
        extra={
          <PillsFiltro
            etiqueta="Filtrar por integración"
            opciones={opciones}
            valor={filtro}
            onChange={setFiltro}
          />
        }
      >
        <DataTable
          columns={columnas}
          data={visibles}
          tamanoPagina={8}
          vacio={
            <EmptyState
              icono={History}
              titulo="Sin eventos"
              descripcion="Esta integración aún no se ha sincronizado."
            />
          }
        />
      </SectionCard>

      <DialogoDiferencias
        abierto={verDiferencias}
        onAbiertoChange={setVerDiferencias}
        diferencias={diferencias}
        folios={folios}
      />
    </div>
  );
}
