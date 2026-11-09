"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import {
  BarraFiltros,
  DataTable,
  EmptyState,
  PillsFiltro,
  SectionCard,
  StatusChip,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { ETIQUETA_PARTIDA } from "@/domain";
import { useAppStore } from "@/store";
import { formatFecha, formatPorcentaje } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  contratosCapturables,
  conteoCortes,
  ESTADO_CORTE,
  filasCortes,
  filtrarCortes,
  OPCIONES_FILTRO_CORTES,
  type FiltroCortes,
  type FilaCorte,
} from "./agregados";
import type { ContextoExpediente } from "./contexto";
import { DialogoCorte } from "./dialogo-corte";
import { DialogoRechazoCorte } from "./dialogo-rechazo-corte";
import { PanelCorte } from "./panel-corte";

const COLUMNAS_BASE: ColumnDef<FilaCorte>[] = [
  {
    id: "semana",
    header: "Semana",
    accessorFn: (f) => f.corte.semana,
    cell: ({ row }) => (
      <span className="block">
        <span className="block font-medium text-brand-primary">
          Semana del {formatFecha(row.original.corte.semana)}
        </span>
        <span className="block text-xs text-brand-text-muted">
          {row.original.contrato.folio}
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
    id: "avance",
    header: "% de la semana",
    accessorFn: (f) => f.avanceSemana,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatPorcentaje(row.original.avanceSemana)}</span>
    ),
  },
  {
    id: "estado",
    header: "Estado",
    accessorFn: (f) => f.corte.estado,
    cell: ({ row }) => {
      const { etiqueta, estatus } = ESTADO_CORTE[row.original.corte.estado];
      return <StatusChip estatus={estatus} etiqueta={etiqueta} />;
    },
  },
  {
    id: "firmo",
    header: "Firmó",
    accessorFn: (f) => f.corte.firmadoPor ?? "—",
    cell: ({ row }) => (
      <span className="block">
        <span className="block">{row.original.corte.firmadoPor ?? "—"}</span>
        {row.original.corte.firmadoEn ? (
          <span className="block text-xs text-brand-text-muted">
            {formatFecha(row.original.corte.firmadoEn)}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    id: "valido",
    header: "Validó",
    accessorFn: (f) => f.corte.validadoPor ?? "—",
    cell: ({ row }) => (
      <span className="block">
        <span className="block">{row.original.corte.validadoPor ?? "—"}</span>
        {row.original.corte.validadoEn ? (
          <span className="block text-xs text-brand-text-muted">
            {formatFecha(row.original.corte.validadoEn)}
          </span>
        ) : null}
      </span>
    ),
  },
];

/** Cortes semanales del proyecto: lista filtrable, captura del Supervisor y validación de la PMO. */
export function PestanaCortes({ contratos, cortes, hoy, rol }: ContextoExpediente) {
  const registrarCorte = useAppStore((s) => s.registrarCorte);
  const validarCorte = useAppStore((s) => s.validarCorte);
  const rechazarCorte = useAppStore((s) => s.rechazarCorte);
  const [filtro, setFiltro] = useState<FiltroCortes>("TODOS");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [rechazando, setRechazando] = useState(false);

  const puedeCapturar = can(rol, "obra.corteCapturar");
  const puedeValidar = can(rol, "obra.corteValidar");
  const filas = useMemo(
    () => filasCortes(filtrarCortes(cortes, filtro), contratos),
    [cortes, contratos, filtro],
  );
  const capturables = useMemo(
    () => contratosCapturables(contratos, cortes, hoy),
    [contratos, cortes, hoy],
  );
  const columnas = useMemo<ColumnDef<FilaCorte>[]>(
    () => [
      ...COLUMNAS_BASE,
      {
        id: "ver",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSeleccionadoId(row.original.corte.id)}
            aria-label={`Ver corte de ${row.original.contrato.folio}, semana del ${formatFecha(row.original.corte.semana)}`}
          >
            Ver
          </Button>
        ),
      },
    ],
    [],
  );
  const seleccionada = filasCortes(cortes, contratos).find(
    (f) => f.corte.id === seleccionadoId,
  );

  return (
    <div
      className={cn(
        "grid items-start gap-6",
        seleccionada && "xl:grid-cols-[minmax(0,1fr)_28rem]",
      )}
    >
      <SectionCard
        titulo={`Cortes semanales (${cortes.length})`}
        className="min-w-0"
        extra={
          puedeCapturar ? (
            <Button
              onClick={() => setCapturando(true)}
              disabled={capturables.length === 0}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              Registrar corte
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <BarraFiltros>
            <PillsFiltro
              etiqueta="Estado del corte"
              valor={filtro}
              onChange={setFiltro}
              opciones={OPCIONES_FILTRO_CORTES.map((o) => ({
                ...o,
                conteo: conteoCortes(cortes, o.valor),
              }))}
            />
          </BarraFiltros>
          <DataTable
            columns={columnas}
            data={filas}
            tamanoPagina={12}
            onFilaClick={(f) => setSeleccionadoId(f.corte.id)}
            vacio={
              <EmptyState
                icono={ClipboardList}
                titulo="Sin cortes en esta vista"
                descripcion="Cambia el filtro o registra el corte de la semana."
              />
            }
          />
        </div>
      </SectionCard>
      {seleccionada ? (
        <PanelCorte
          fila={seleccionada}
          cortes={cortes}
          puedeValidar={puedeValidar}
          onCerrar={() => setSeleccionadoId(null)}
          onValidar={() => {
            validarCorte(seleccionada.corte.id);
            toast.success("Corte validado: ya cuenta para el avance.");
          }}
          onRechazar={() => setRechazando(true)}
        />
      ) : null}
      {capturando ? (
        <DialogoCorte
          abierto
          onCambioAbierto={setCapturando}
          contratos={capturables}
          cortes={cortes}
          hoy={hoy}
          onFirmar={(entrada) => {
            registrarCorte(entrada);
            toast.success("Corte firmado y enviado a la PMO.");
          }}
        />
      ) : null}
      {rechazando && seleccionada ? (
        <DialogoRechazoCorte
          abierto
          onCambioAbierto={setRechazando}
          descripcionCorte={`${seleccionada.contrato.folio}, semana del ${formatFecha(seleccionada.corte.semana)}`}
          onRechazar={(comentario) => {
            rechazarCorte(seleccionada.corte.id, comentario);
            toast.success("Corte rechazado: el Supervisor podrá recapturarlo.");
          }}
        />
      ) : null}
    </div>
  );
}
