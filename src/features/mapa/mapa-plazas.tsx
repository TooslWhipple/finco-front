"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPinOff } from "lucide-react";
import {
  BarraFiltros,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  PanelDetalle,
  PillsFiltro,
  SectionCard,
  SegmentedControl,
  SelectorPill,
  StatusChip,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { esPlazaDeTerreno, rutaPlaza } from "@/domain";
import { useCiudades, useLocales, usePlazas } from "@/hooks";
import { formatMoneda, formatNumero, formatPorcentaje } from "@/lib/format";
import { FONDO_PREVENTA, FONDO_RANGO } from "@/features/panorama/estilo-rango";
import { cn } from "@/lib/utils";
import {
  FILTRO_INICIAL,
  TODOS,
  ciudadesConPlazas,
  filtrarPlazasMapa,
  kpisMapa,
  ordenarPlazasMapa,
  resumirPlazasMapa,
} from "./agregados";
import type { FiltroMapa, OrdenLista, PlazaMapa } from "./agregados";

const MapaPines = dynamic(() => import("./mapa-pines"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-text-muted">
      Cargando mapa…
    </div>
  ),
});

const ESTATUS = [
  { valor: TODOS, etiqueta: "Todas" },
  { valor: "EN_OPERACION", etiqueta: "En operación" },
  { valor: "PREVENTA", etiqueta: "Preventa" },
] as const;

const RANGOS = [
  { valor: TODOS, etiqueta: "Toda ocupación" },
  { valor: "ALTA", etiqueta: "Alta (≥ 90%)" },
  { valor: "MEDIA", etiqueta: "Media (75–89%)" },
  { valor: "BAJA", etiqueta: "Baja (< 75%)" },
] as const;

const ORDENES = [
  { valor: "OCUPACION", etiqueta: "Ocupación" },
  { valor: "DISPONIBLES", etiqueta: "Disponibles" },
  { valor: "NOMBRE", etiqueta: "Nombre" },
] as const;

const LEYENDA = [
  { fondo: FONDO_RANGO.ALTA, texto: "Ocupación ≥ 90%" },
  { fondo: FONDO_RANGO.MEDIA, texto: "75–89%" },
  { fondo: FONDO_RANGO.BAJA, texto: "< 75%" },
  { fondo: FONDO_PREVENTA, texto: "Nueva / preventa" },
] as const;

/** Alto común del mapa y de su panel lateral. */
const ALTO = "h-[min(40rem,60dvh)]";

function FichaPlaza({ p }: { p: PlazaMapa }) {
  const preventa = p.plaza.estatus === "PREVENTA";
  return (
    <dl className="grid grid-cols-2 gap-3">
      <div>
        <dt className="text-xs text-brand-text-muted">
          {preventa ? "Ocupación" : "Ocupación actual"}
        </dt>
        <dd className="font-heading text-lg font-semibold text-brand-primary">
          {preventa ? "—" : formatPorcentaje(p.ocupacion)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-brand-text-muted">Locales por colocar</dt>
        <dd className="font-heading text-lg font-semibold text-brand-primary">
          {formatNumero(p.disponibles)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-brand-text-muted">Locales totales</dt>
        <dd className="font-medium">{formatNumero(p.totalLocales)}</dd>
      </div>
      <div>
        <dt className="text-xs text-brand-text-muted">Renta promedio</dt>
        <dd className="font-medium">
          {p.rentaPromedio > 0 ? `${formatMoneda(p.rentaPromedio)} / mes` : "—"}
        </dd>
      </div>
    </dl>
  );
}

function ListaOrdenable({
  plazas,
  onSeleccionar,
}: {
  plazas: readonly PlazaMapa[];
  onSeleccionar: (id: string) => void;
}) {
  const [orden, setOrden] = useState<OrdenLista>("OCUPACION");
  const ordenadas = useMemo(() => ordenarPlazasMapa(plazas, orden), [plazas, orden]);
  return (
    <SectionCard
      titulo={`Plazas (${formatNumero(plazas.length)})`}
      className={cn("flex flex-col", ALTO)}
      sinPadding
    >
      <div className="px-5 pt-3 pb-2">
        <SegmentedControl
          etiqueta="Ordenar plazas por"
          opciones={ORDENES}
          valor={orden}
          onChange={setOrden}
          variante="suave"
        />
      </div>
      {ordenadas.length === 0 ? (
        <EmptyState
          icono={MapPinOff}
          titulo="Sin plazas con estos filtros"
          descripcion="Quita un filtro para ver más plazas."
        />
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-brand-line overflow-y-auto border-t border-brand-line">
          {ordenadas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(p.id)}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors outline-none hover:bg-brand-cream focus-visible:bg-brand-cream"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "size-3 shrink-0 rounded-full",
                      p.rango ? FONDO_RANGO[p.rango] : FONDO_PREVENTA,
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-brand-primary">
                      {p.plaza.nombre}
                    </span>
                    <span className="block truncate text-sm text-brand-text-muted">
                      {p.ciudad.nombre}, {p.ciudad.estado}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  <span className="block text-brand-text">
                    {p.rango ? formatPorcentaje(p.ocupacion) : "Preventa"}
                  </span>
                  <span className="block text-brand-text-muted">
                    {formatNumero(p.disponibles)} disp.
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

interface MapaPlazasProps {
  /** Plaza preseleccionada (llega de "Ver en mapa" en la ficha de la plaza). */
  plazaInicialId?: string;
}

export function MapaPlazas({ plazaInicialId }: MapaPlazasProps) {
  const ciudades = useCiudades().datos;
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;

  const [filtro, setFiltro] = useState<FiltroMapa>(FILTRO_INICIAL);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(
    plazaInicialId ?? null,
  );

  const todas = useMemo(
    () =>
      ciudades && plazas && locales
        ? resumirPlazasMapa(ciudades, plazas, locales)
        : undefined,
    [ciudades, plazas, locales],
  );
  const visibles = useMemo(
    () => (todas ? filtrarPlazasMapa(todas, filtro) : undefined),
    [todas, filtro],
  );
  const kpis = useMemo(() => (visibles ? kpisMapa(visibles) : undefined), [visibles]);
  // Una selección que el filtro oculta deja de mostrarse en el panel.
  const seleccionada = visibles?.find((p) => p.id === seleccionadaId);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mapa de plazas"
        descripcion="Ubicación y ocupación de cada plaza. Acerca el mapa para separar los grupos."
      />

      <KpiRow>
        <KpiCard
          etiqueta="Plazas"
          valor={kpis ? formatNumero(kpis.plazas) : "—"}
          subtexto={kpis ? `en ${formatNumero(kpis.ciudades)} ciudades` : undefined}
        />
        <KpiCard
          etiqueta="Ocupación promedio"
          valor={kpis ? formatPorcentaje(kpis.ocupacionPromedio) : "—"}
          subtexto="plazas en operación"
        />
        <KpiCard
          etiqueta="En preventa"
          valor={kpis ? formatNumero(kpis.enPreventa) : "—"}
          subtexto="plazas nuevas"
        />
        <KpiCard
          etiqueta="Locales disponibles"
          valor={kpis ? formatNumero(kpis.disponibles) : "—"}
          subtexto="incluye plazas nuevas"
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
                ...ciudadesConPlazas(todas ?? []).map((c) => ({
                  valor: c.id,
                  etiqueta: c.nombre,
                })),
              ]}
              onChange={(ciudadId) => setFiltro((f) => ({ ...f, ciudadId }))}
            />
            <SelectorPill
              etiqueta="Filtrar por ocupación"
              valor={filtro.rango}
              opciones={RANGOS}
              onChange={(rango) =>
                setFiltro((f) => ({ ...f, rango: rango as FiltroMapa["rango"] }))
              }
            />
          </>
        }
      >
        <PillsFiltro
          etiqueta="Filtrar por estatus"
          opciones={ESTATUS}
          valor={filtro.estatus}
          onChange={(estatus) => setFiltro((f) => ({ ...f, estatus }))}
        />
      </BarraFiltros>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-label="Mapa"
          className={cn(
            "relative overflow-hidden rounded-xl border border-brand-line bg-card shadow-xs",
            ALTO,
          )}
        >
          {!visibles ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-text-muted">
              Cargando plazas…
            </div>
          ) : (
            <MapaPines
              plazas={visibles}
              seleccionadaId={seleccionada?.id ?? null}
              onSeleccionar={setSeleccionadaId}
            />
          )}
          <ul className="absolute bottom-4 left-4 z-[1000] flex items-center gap-4 rounded-xl bg-card px-4 py-2.5 text-sm text-brand-text shadow-md">
            {LEYENDA.map((l) => (
              <li key={l.texto} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("size-2.5 rounded-full", l.fondo)} />
                {l.texto}
              </li>
            ))}
          </ul>
        </section>

        {seleccionada ? (
          <PanelDetalle
            className={ALTO}
            titulo={seleccionada.plaza.nombre}
            subtitulo={`${seleccionada.ciudad.nombre}, ${seleccionada.ciudad.estado}`}
            estado={<StatusChip estatus={seleccionada.plaza.estatus} />}
            onCerrar={() => setSeleccionadaId(null)}
            secciones={[
              { titulo: "Resumen", contenido: <FichaPlaza p={seleccionada} /> },
              ...(seleccionada.plaza.direccion
                ? [{ titulo: "Dirección", contenido: seleccionada.plaza.direccion }]
                : []),
            ]}
            acciones={
              <Link
                href={rutaPlaza(seleccionada.id)}
                className={buttonVariants({ variant: "default" })}
              >
                {esPlazaDeTerreno(seleccionada.id) ? "Ver terreno" : "Ver plaza"}
              </Link>
            }
          />
        ) : (
          <ListaOrdenable plazas={visibles ?? []} onSeleccionar={setSeleccionadaId} />
        )}
      </div>
    </div>
  );
}
