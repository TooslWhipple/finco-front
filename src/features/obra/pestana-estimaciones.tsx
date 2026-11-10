"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptText } from "lucide-react";
import { toast } from "sonner";
import {
  BarraFiltros,
  DataTable,
  EmptyState,
  MoneyAmount,
  PillsFiltro,
  SectionCard,
  StatusChip,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { ETIQUETA_PARTIDA } from "@/domain";
import { useAppStore } from "@/store";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  contratosEstimables,
  ESTADO_ESTIMACION,
  filasEstimaciones,
  filtrarEstimaciones,
  OPCIONES_FILTRO_ESTIMACIONES,
  type FiltroEstimaciones,
  type FilaEstimacion,
} from "./agregados-estimaciones";
import type { ContextoExpediente } from "./contexto";
import { DialogoEstimacion } from "./dialogo-estimacion";
import { DialogoRechazoEstimacion } from "./dialogo-rechazo-estimacion";
import { PanelEstimacion } from "./panel-estimacion";

const COLUMNAS_BASE: ColumnDef<FilaEstimacion>[] = [
  {
    id: "estimacion",
    header: "Estimación",
    accessorFn: (f) => `${f.contrato.folio}-${f.estimacion.numero}`,
    cell: ({ row }) => (
      <span className="block">
        <span className="block font-medium text-brand-primary">
          {row.original.contrato.folio} · No. {row.original.estimacion.numero}
        </span>
        <span className="block text-xs text-brand-text-muted">
          Del {formatFecha(row.original.estimacion.periodo.desde)} al{" "}
          {formatFecha(row.original.estimacion.periodo.hasta)}
        </span>
      </span>
    ),
  },
  {
    id: "partida",
    header: "Partida",
    accessorFn: (f) => ETIQUETA_PARTIDA[f.contrato.partida],
  },
  {
    id: "bruto",
    header: "Importe bruto",
    accessorFn: (f) => f.estimacion.importeBruto,
    cell: ({ row }) => <MoneyAmount valor={row.original.estimacion.importeBruto} />,
  },
  {
    id: "neto",
    header: "Neto a transferir",
    accessorFn: (f) => f.estimacion.importeNeto,
    cell: ({ row }) => (
      <MoneyAmount valor={row.original.estimacion.importeNeto} className="font-medium" />
    ),
  },
  {
    id: "estado",
    header: "Estado",
    accessorFn: (f) => f.estimacion.estado,
    cell: ({ row }) => {
      const { etiqueta, estatus } = ESTADO_ESTIMACION[row.original.estimacion.estado];
      return <StatusChip estatus={estatus} etiqueta={etiqueta} />;
    },
  },
];

/** Estimaciones de pago del contratista: registro del Supervisor y autorización de la PMO. */
export function PestanaEstimaciones({
  contratos,
  cortes,
  estimaciones,
  rol,
}: ContextoExpediente) {
  const registrarEstimacion = useAppStore((s) => s.registrarEstimacion);
  const autorizarEstimacion = useAppStore((s) => s.autorizarEstimacion);
  const rechazarEstimacion = useAppStore((s) => s.rechazarEstimacion);
  const [filtro, setFiltro] = useState<FiltroEstimaciones>("TODAS");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [rechazando, setRechazando] = useState(false);

  const puedeRegistrar = can(rol, "obra.estimacionRegistrar");
  const puedeAutorizar = can(rol, "obra.estimacionAutorizar");
  const filas = useMemo(
    () => filasEstimaciones(filtrarEstimaciones(estimaciones, filtro), contratos),
    [estimaciones, contratos, filtro],
  );
  const estimables = useMemo(
    () => contratosEstimables(contratos, cortes, estimaciones),
    [contratos, cortes, estimaciones],
  );
  const columnas = useMemo<ColumnDef<FilaEstimacion>[]>(
    () => [
      ...COLUMNAS_BASE,
      {
        id: "ver",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSeleccionadaId(row.original.estimacion.id)}
            aria-label={`Ver estimación ${row.original.estimacion.numero} de ${row.original.contrato.folio}`}
          >
            Ver
          </Button>
        ),
      },
    ],
    [],
  );
  const seleccionada = filasEstimaciones(estimaciones, contratos).find(
    (f) => f.estimacion.id === seleccionadaId,
  );

  return (
    <div
      className={cn(
        "grid items-start gap-6",
        seleccionada && "xl:grid-cols-[minmax(0,1fr)_28rem]",
      )}
    >
      <SectionCard
        titulo={`Estimaciones de pago (${estimaciones.length})`}
        className="min-w-0"
        extra={
          puedeRegistrar ? (
            <Button
              onClick={() => setRegistrando(true)}
              disabled={estimables.length === 0}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              Registrar estimación
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <BarraFiltros>
            <PillsFiltro
              etiqueta="Estado de la estimación"
              valor={filtro}
              onChange={setFiltro}
              opciones={OPCIONES_FILTRO_ESTIMACIONES.map((o) => ({
                ...o,
                conteo: filtrarEstimaciones(estimaciones, o.valor).length,
              }))}
            />
          </BarraFiltros>
          <DataTable
            columns={columnas}
            data={filas}
            tamanoPagina={12}
            onFilaClick={(f) => setSeleccionadaId(f.estimacion.id)}
            vacio={
              <EmptyState
                icono={ReceiptText}
                titulo="Sin estimaciones en esta vista"
                descripcion="Cambia el filtro o registra la estimación que entregó el contratista."
              />
            }
          />
        </div>
      </SectionCard>
      {seleccionada ? (
        <PanelEstimacion
          fila={seleccionada}
          puedeAutorizar={puedeAutorizar}
          onCerrar={() => setSeleccionadaId(null)}
          onAutorizar={() => {
            autorizarEstimacion(seleccionada.estimacion.id);
            toast.success(
              "Pago autorizado: ya cuenta en el costo real del valor ganado.",
            );
          }}
          onRechazar={() => setRechazando(true)}
        />
      ) : null}
      {registrando ? (
        <DialogoEstimacion
          abierto
          onCambioAbierto={setRegistrando}
          contratos={estimables}
          cortes={cortes}
          estimaciones={estimaciones}
          onFirmar={(entrada) => {
            registrarEstimacion(entrada);
            toast.success("Estimación firmada y enviada a la PMO.");
          }}
        />
      ) : null}
      {rechazando && seleccionada ? (
        <DialogoRechazoEstimacion
          abierto
          onCambioAbierto={setRechazando}
          descripcion={`${seleccionada.contrato.folio}, estimación ${seleccionada.estimacion.numero}`}
          onRechazar={(comentario) => {
            rechazarEstimacion(seleccionada.estimacion.id, comentario);
            toast.success("Estimación rechazada: el volumen queda libre para estimarse.");
          }}
        />
      ) : null}
    </div>
  );
}
