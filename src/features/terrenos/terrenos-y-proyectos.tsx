"use client";

import { useMemo, useState } from "react";
import { Layers, RefreshCw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BarraFiltros,
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  PillsFiltro,
  SectionCard,
  SegmentedControl,
  SelectorPill,
  StatusChip,
  TableroKanban,
} from "@/components/shared";
import { can } from "@/config/permissions";
import { coordenadasTerreno } from "@/data/terrenos";
import {
  DEMO_TODAY,
  ETAPAS_TERRENO,
  ETIQUETA_ETAPA_TERRENO,
  ETIQUETA_SEMAFORO_TERRENO,
  semaforoTerreno,
  type Terreno,
} from "@/domain";
import {
  useCiudades,
  useIntegraciones,
  usePlazas,
  useSesion,
  useTerrenos,
} from "@/hooks";
import { formatFecha, formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  FILTRO_INICIAL,
  TODOS,
  filtrarTerrenos,
  kpisTerrenos,
  terrenosDeEtapa,
} from "./agregados";
import { DetalleTerreno } from "./detalle-terreno";

type Vista = "TABLERO" | "LISTA";

const VISTAS = [
  { valor: "TABLERO", etiqueta: "Tablero" },
  { valor: "LISTA", etiqueta: "Lista" },
] as const;

const FONDO_SEMAFORO = {
  VERDE: "bg-brand-secondary",
  AMARILLO: "bg-brand-cta",
  ROJO: "bg-brand-coral",
} as const;

interface TerrenosYProyectosProps {
  /** Proyecto abierto al entrar (llega del Mapa o de la ficha de una plaza). */
  terrenoInicialId?: string;
}

function BarraAvance({ terreno }: { terreno: Terreno }) {
  const semaforo = semaforoTerreno(terreno, DEMO_TODAY);
  return (
    <div
      role="progressbar"
      aria-label="Avance"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={terreno.avancePct}
      className="h-1.5 w-full overflow-hidden rounded-full bg-brand-line"
    >
      <div
        className={cn("h-full rounded-full", FONDO_SEMAFORO[semaforo])}
        style={{ width: `${terreno.avancePct}%` }}
      />
    </div>
  );
}

export function TerrenosYProyectos({ terrenoInicialId }: TerrenosYProyectosProps) {
  const { rol } = useSesion();
  const terrenos = useTerrenos().datos;
  const ciudades = useCiudades().datos;
  const plazas = usePlazas().datos;
  const monday = useIntegraciones().datos?.find((i) => i.id === "MONDAY");
  const moverEtapaTerreno = useAppStore((s) => s.moverEtapaTerreno);
  const actualizarAvanceTerreno = useAppStore((s) => s.actualizarAvanceTerreno);

  const [vista, setVista] = useState<Vista>("TABLERO");
  const [filtro, setFiltro] = useState(FILTRO_INICIAL);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    terrenoInicialId ?? null,
  );

  const ciudadPorId = useMemo(
    () => new Map((ciudades ?? []).map((c) => [c.id, c])),
    [ciudades],
  );
  const visibles = useMemo(
    () => filtrarTerrenos(terrenos, filtro, DEMO_TODAY),
    [terrenos, filtro],
  );
  const kpis = useMemo(() => kpisTerrenos(visibles, DEMO_TODAY), [visibles]);
  const seleccionado = terrenos.find((t) => t.id === seleccionadoId);
  const ciudadSel = seleccionado ? ciudadPorId.get(seleccionado.ciudadId) : undefined;
  const posicionSel =
    seleccionado && ciudadSel
      ? coordenadasTerreno(seleccionado, ciudadSel, plazas ?? [])
      : undefined;
  const puedeGestionar = can(rol, "terrenos.gestionar");
  const nombreCiudad = (t: Terreno) => ciudadPorId.get(t.ciudadId)?.nombre ?? t.ciudadId;

  const columnas = useMemo<ColumnDef<Terreno>[]>(
    () => [
      {
        id: "proyecto",
        header: "Proyecto",
        accessorFn: (t) => t.nombre,
        cell: ({ row }) => (
          <span className="font-medium text-brand-primary">{row.original.nombre}</span>
        ),
      },
      {
        id: "ciudad",
        header: "Ciudad",
        accessorFn: (t) => ciudadPorId.get(t.ciudadId)?.nombre ?? t.ciudadId,
      },
      {
        id: "etapa",
        header: "Etapa",
        accessorFn: (t) => ETAPAS_TERRENO.indexOf(t.etapa),
        cell: ({ row }) => <StatusChip estatus={row.original.etapa} />,
      },
      {
        id: "semaforo",
        header: "Semáforo",
        accessorFn: (t) => semaforoTerreno(t, DEMO_TODAY),
        cell: ({ row }) => (
          <StatusChip estatus={semaforoTerreno(row.original, DEMO_TODAY)} />
        ),
      },
      {
        id: "avance",
        header: "Avance",
        accessorFn: (t) => t.avancePct,
        cell: ({ row }) => `${row.original.avancePct}%`,
      },
      { id: "responsable", header: "Responsable", accessorFn: (t) => t.responsable },
      {
        id: "objetivo",
        header: "Fecha objetivo",
        accessorFn: (t) => t.fechaObjetivo,
        cell: ({ row }) => formatFecha(row.original.fechaObjetivo),
      },
    ],
    [ciudadPorId],
  );

  const conteoSemaforo = (semaforo: string) =>
    filtrarTerrenos(
      terrenos,
      { ...filtro, semaforo: semaforo as typeof filtro.semaforo },
      DEMO_TODAY,
    ).length;

  const columnasKanban = ETAPAS_TERRENO.map((etapa) => ({
    id: etapa,
    titulo: ETIQUETA_ETAPA_TERRENO[etapa],
    items: terrenosDeEtapa(visibles, etapa),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Terrenos y proyectos"
        descripcion="Del predio a la apertura: etapa, avance y responsable de cada desarrollo."
        acciones={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cream px-3 py-1 text-xs font-medium text-brand-primary ring-1 ring-brand-line">
            <RefreshCw aria-hidden className="size-3.5" />
            Sincronizado con Monday
            {monday ? ` · ${formatFecha(monday.ultimoSync.slice(0, 10))}` : ""}
          </span>
        }
      />
      {!puedeGestionar ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Los proyectos los gestiona Superadmin.
        </p>
      ) : null}

      <KpiRow>
        <KpiCard
          etiqueta="Proyectos activos"
          valor={formatNumero(kpis.activos)}
          subtexto="aún no abren"
        />
        <KpiCard
          etiqueta="m² en desarrollo"
          valor={formatNumero(kpis.m2EnDesarrollo)}
          subtexto="de predio"
        />
        <KpiCard
          etiqueta="Locales proyectados"
          valor={formatNumero(kpis.localesProyectados)}
          subtexto="en proyectos activos"
        />
        <KpiCard
          etiqueta="En riesgo"
          valor={formatNumero(kpis.enRiesgo)}
          subtexto="semáforo rojo"
        />
      </KpiRow>

      <BarraFiltros
        envolver
        derecha={
          <>
            <SelectorPill
              etiqueta="Filtrar por ciudad"
              valor={filtro.ciudadId}
              opciones={[
                { valor: TODOS, etiqueta: "Todas las ciudades" },
                ...[...new Set(terrenos.map((t) => t.ciudadId))].map((id) => ({
                  valor: id,
                  etiqueta: ciudadPorId.get(id)?.nombre ?? id,
                })),
              ]}
              onChange={(ciudadId) => setFiltro((f) => ({ ...f, ciudadId }))}
            />
            <SegmentedControl
              etiqueta="Vista"
              opciones={VISTAS}
              valor={vista}
              onChange={setVista}
            />
          </>
        }
      >
        <PillsFiltro
          etiqueta="Filtrar por semáforo"
          valor={filtro.semaforo}
          onChange={(semaforo) =>
            setFiltro((f) => ({ ...f, semaforo: semaforo as typeof f.semaforo }))
          }
          opciones={[
            { valor: TODOS, etiqueta: "Todos", conteo: conteoSemaforo(TODOS) },
            ...(["VERDE", "AMARILLO", "ROJO"] as const).map((s) => ({
              valor: s,
              etiqueta: ETIQUETA_SEMAFORO_TERRENO[s],
              conteo: conteoSemaforo(s),
            })),
          ]}
        />
      </BarraFiltros>

      <div
        className={cn(
          "grid items-start gap-6",
          seleccionado && "xl:grid-cols-[minmax(0,1fr)_26rem]",
        )}
      >
        <SectionCard
          titulo={`Proyectos (${formatNumero(visibles.length)})`}
          className="min-w-0"
        >
          {visibles.length === 0 ? (
            <EmptyState
              icono={Layers}
              titulo="Sin proyectos con estos filtros"
              descripcion="Quita un filtro para ver más proyectos."
            />
          ) : vista === "TABLERO" ? (
            <TableroKanban
              etiqueta="Proyectos por etapa"
              columnas={columnasKanban}
              clave={(t) => t.id}
              vacio="Sin proyectos"
              renderTarjeta={(t) => (
                <button
                  type="button"
                  onClick={() => setSeleccionadoId(t.id)}
                  className={cn(
                    "w-full space-y-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-colors outline-none hover:border-brand-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                    t.id === seleccionadoId
                      ? "border-brand-primary"
                      : "border-brand-line",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium text-brand-primary">{t.nombre}</span>
                    <StatusChip estatus={semaforoTerreno(t, DEMO_TODAY)} />
                  </span>
                  <span className="block text-xs text-brand-text-muted">
                    {nombreCiudad(t)} · {t.responsable}
                  </span>
                  <BarraAvance terreno={t} />
                  <span className="flex justify-between text-xs text-brand-text-muted">
                    <span>{t.avancePct}%</span>
                    <span>Meta {formatFecha(t.fechaObjetivo)}</span>
                  </span>
                </button>
              )}
            />
          ) : (
            <DataTable
              columns={columnas}
              data={visibles}
              tamanoPagina={12}
              onFilaClick={(t) => setSeleccionadoId(t.id)}
            />
          )}
        </SectionCard>
        {seleccionado ? (
          <DetalleTerreno
            terreno={seleccionado}
            hoy={DEMO_TODAY}
            ciudad={ciudadSel}
            posicion={posicionSel}
            puedeGestionar={puedeGestionar}
            onMover={moverEtapaTerreno}
            onActualizarAvance={actualizarAvanceTerreno}
            onCerrar={() => setSeleccionadoId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
