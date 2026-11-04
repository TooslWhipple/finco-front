"use client";

import { useMemo, useState } from "react";
import { Plus, UserX, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  ETAPAS_PROSPECTO,
  ETIQUETA_ETAPA_PROSPECTO,
  ETIQUETA_ORIGEN_PROSPECTO,
  ORIGENES_PROSPECTO,
  type Prospecto,
} from "@/domain";
import {
  useCotizaciones,
  useLocales,
  usePlazas,
  useProspectos,
  useSesion,
} from "@/hooks";
import { formatFecha, formatNumero, formatPorcentaje } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  FILTRO_INICIAL,
  TODOS,
  filtrarProspectos,
  kpisProspectos,
  prospectosDeEtapa,
} from "./agregados";
import { DetalleProspecto } from "./detalle-prospecto";
import { DialogoRegistrarProspecto } from "./dialogo-registrar-prospecto";

type Vista = "TABLERO" | "TABLA";

const VISTAS = [
  { valor: "TABLERO", etiqueta: "Tablero" },
  { valor: "TABLA", etiqueta: "Tabla" },
] as const;

interface ProspectosProps {
  /** Filtra por local de interés (llega del chip de la ficha del local). */
  localInicialId?: string;
  /** Prospecto abierto al entrar (llega del stepper de la cotización). */
  prospectoInicialId?: string;
}

export function Prospectos({ localInicialId, prospectoInicialId }: ProspectosProps) {
  const { rol } = useSesion();
  const prospectos = useProspectos().datos;
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const cotizaciones = useCotizaciones();
  const avanzarProspecto = useAppStore((s) => s.avanzarProspecto);
  const descartarProspecto = useAppStore((s) => s.descartarProspecto);

  const [vista, setVista] = useState<Vista>("TABLERO");
  const [filtro, setFiltro] = useState({
    ...FILTRO_INICIAL,
    localId: localInicialId ?? TODOS,
  });
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    prospectoInicialId ?? null,
  );
  const [registrando, setRegistrando] = useState(false);

  const localesPorId = useMemo(
    () => new Map((locales ?? []).map((l) => [l.id, l])),
    [locales],
  );
  const plazasPorId = useMemo(
    () => new Map((plazas ?? []).map((p) => [p.id, p])),
    [plazas],
  );
  const plazaDeLocal = useMemo(
    () => new Map((locales ?? []).map((l) => [l.id, l.plazaId])),
    [locales],
  );
  const visibles = useMemo(
    () => filtrarProspectos(prospectos, filtro, plazaDeLocal),
    [prospectos, filtro, plazaDeLocal],
  );
  const kpis = useMemo(() => kpisProspectos(visibles), [visibles]);
  const seleccionado = prospectos.find((p) => p.id === seleccionadoId);
  const localFiltrado = localesPorId.get(filtro.localId);

  const puedeGestionar = can(rol, "prospectos.gestionar");
  const codigosLocales = (p: Prospecto) =>
    p.localIds.map((id) => localesPorId.get(id)?.codigo ?? id).join(", ");

  const columnas = useMemo<ColumnDef<Prospecto>[]>(
    () => [
      {
        id: "prospecto",
        header: "Prospecto",
        accessorFn: (p) => p.nombre,
        cell: ({ row }) => (
          <span className="font-medium text-brand-primary">{row.original.nombre}</span>
        ),
      },
      {
        id: "etapa",
        header: "Etapa",
        accessorFn: (p) => ETAPAS_PROSPECTO.indexOf(p.etapa),
        cell: ({ row }) => <StatusChip estatus={row.original.etapa} />,
      },
      { id: "giro", header: "Giro", accessorFn: (p) => p.giro },
      {
        id: "origen",
        header: "Origen",
        accessorFn: (p) => ETIQUETA_ORIGEN_PROSPECTO[p.origen],
      },
      {
        id: "locales",
        header: "Locales",
        accessorFn: (p) =>
          p.localIds.map((id) => localesPorId.get(id)?.codigo ?? id).join(", "),
      },
      {
        id: "alta",
        header: "Alta",
        accessorFn: (p) => p.creadoEl,
        cell: ({ row }) => formatFecha(row.original.creadoEl),
      },
    ],
    [localesPorId],
  );

  const conteoEtapa = (etapa: string) =>
    filtrarProspectos(prospectos, { ...filtro, etapa }, plazaDeLocal).length;

  const lista =
    visibles.length === 0 ? (
      <EmptyState
        icono={UserX}
        titulo="Sin prospectos con estos filtros"
        descripcion="Quita un filtro o registra un prospecto nuevo."
      />
    ) : vista === "TABLERO" ? (
      <TableroKanban
        etiqueta="Embudo de prospectos"
        columnas={ETAPAS_PROSPECTO.map((etapa) => ({
          id: etapa,
          titulo: ETIQUETA_ETAPA_PROSPECTO[etapa],
          items: prospectosDeEtapa(visibles, etapa),
        }))}
        clave={(p) => p.id}
        vacio="Sin prospectos"
        renderTarjeta={(p) => (
          <button
            type="button"
            onClick={() => setSeleccionadoId(p.id)}
            aria-pressed={p.id === seleccionadoId}
            className={cn(
              "w-full rounded-lg border bg-card p-3 text-left shadow-xs transition-colors outline-none hover:border-brand-indigo focus-visible:ring-3 focus-visible:ring-ring/50",
              p.id === seleccionadoId ? "border-brand-indigo" : "border-brand-line",
            )}
          >
            <span className="block truncate font-medium text-brand-primary">
              {p.nombre}
            </span>
            <span className="block truncate text-xs text-brand-text-muted">
              {p.giro} · {ETIQUETA_ORIGEN_PROSPECTO[p.origen]}
            </span>
            <span className="mt-1.5 block truncate text-xs text-brand-text">
              Local {codigosLocales(p)}
            </span>
          </button>
        )}
      />
    ) : (
      <DataTable
        columns={columnas}
        data={visibles}
        tamanoPagina={12}
        onFilaClick={(p) => setSeleccionadoId(p.id)}
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Prospectos"
        descripcion="Embudo comercial: desde el primer contacto hasta el contrato."
        acciones={
          puedeGestionar ? (
            <Button
              onClick={() => setRegistrando(true)}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              <Plus aria-hidden />
              Registrar prospecto
            </Button>
          ) : null
        }
      />
      {!puedeGestionar ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Los prospectos los gestiona Ventas.
        </p>
      ) : null}

      <KpiRow>
        <KpiCard
          etiqueta="Prospectos activos"
          valor={formatNumero(kpis.activos)}
          subtexto="aún sin ganar ni perder"
        />
        <KpiCard
          etiqueta="Sin contactar"
          valor={formatNumero(kpis.sinContactar)}
          subtexto="nuevos, en espera del primer contacto"
        />
        <KpiCard
          etiqueta="En cotización"
          valor={formatNumero(kpis.enCotizacion)}
          subtexto={`con cotización enviada · ${formatNumero(kpis.porCotizar)} con visita, por cotizar`}
        />
        <KpiCard
          etiqueta="Tasa de cierre"
          valor={kpis.tasaCierre === null ? "—" : formatPorcentaje(kpis.tasaCierre)}
          subtexto="ganados entre cerrados"
        />
      </KpiRow>

      <BarraFiltros
        envolver
        derecha={
          <>
            <SelectorPill
              etiqueta="Filtrar por plaza"
              valor={filtro.plazaId}
              opciones={[
                { valor: TODOS, etiqueta: "Todas las plazas" },
                ...(plazas ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre })),
              ]}
              onChange={(plazaId) => setFiltro((f) => ({ ...f, plazaId }))}
            />
            <SelectorPill
              etiqueta="Filtrar por origen"
              valor={filtro.origen}
              opciones={[
                { valor: TODOS, etiqueta: "Todos los orígenes" },
                ...ORIGENES_PROSPECTO.map((o) => ({
                  valor: o,
                  etiqueta: ETIQUETA_ORIGEN_PROSPECTO[o],
                })),
              ]}
              onChange={(origen) => setFiltro((f) => ({ ...f, origen }))}
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
          etiqueta="Filtrar por etapa"
          valor={filtro.etapa}
          onChange={(etapa) => setFiltro((f) => ({ ...f, etapa }))}
          opciones={[
            { valor: TODOS, etiqueta: "Todas", conteo: conteoEtapa(TODOS) },
            ...ETAPAS_PROSPECTO.map((etapa) => ({
              valor: etapa,
              etiqueta: ETIQUETA_ETAPA_PROSPECTO[etapa],
              conteo: conteoEtapa(etapa),
            })),
          ]}
        />
      </BarraFiltros>
      {filtro.localId !== TODOS ? (
        <p className="flex items-center gap-2 text-sm text-brand-text-muted">
          Interesados en el local{" "}
          <span className="font-medium text-brand-primary">
            {localFiltrado?.codigo ?? filtro.localId}
          </span>
          <button
            type="button"
            onClick={() => setFiltro((f) => ({ ...f, localId: TODOS }))}
            aria-label="Quitar filtro de local"
            className="rounded-md p-1 hover:bg-brand-cream hover:text-brand-primary"
          >
            <X className="size-4" aria-hidden />
          </button>
        </p>
      ) : null}

      <div
        className={cn(
          "grid items-start gap-6",
          seleccionado && "xl:grid-cols-[minmax(0,1fr)_24rem]",
        )}
      >
        <SectionCard
          titulo={`${vista === "TABLERO" ? "Embudo" : "Prospectos"} (${formatNumero(visibles.length)})`}
          className="min-w-0"
        >
          {lista}
        </SectionCard>
        {seleccionado ? (
          <DetalleProspecto
            className="max-h-[48rem]"
            prospecto={seleccionado}
            locales={localesPorId}
            plazas={plazasPorId}
            cotizaciones={cotizaciones}
            puedeGestionar={puedeGestionar}
            puedeCotizar={can(rol, "cotizaciones.crear")}
            onAvanzar={avanzarProspecto}
            onDescartar={descartarProspecto}
            onCerrar={() => setSeleccionadoId(null)}
          />
        ) : null}
      </div>

      <DialogoRegistrarProspecto
        abierto={registrando}
        onCambioAbierto={setRegistrando}
        onRegistrado={setSeleccionadoId}
      />
    </div>
  );
}
