"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, Download, Filter, Maximize2, Sparkles } from "lucide-react";
import {
  DEMO_TODAY,
  contratosPorVencer,
  localesPorColocar,
  montoCobrado,
  ocupacion,
  porcentajeCobrado,
  variacionOcupacion,
} from "@/domain";
import {
  KpiCard,
  KpiRow,
  PageHeader,
  PillsFiltro,
  SegmentedControl,
} from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useCiudades,
  useContratos,
  useFacturas,
  useLocales,
  usePlazas,
  useSesion,
} from "@/hooks";
import { avisarProximaFase } from "@/lib/avisos";
import {
  formatFechaLarga,
  formatMesCorto,
  formatMonedaMillones,
  formatNumero,
  formatPorcentaje,
  formatPuntos,
} from "@/lib/format";
import { MES_DEMO, saludoPorHora } from "@/lib/tiempo";
import { cn } from "@/lib/utils";
import {
  estadosDe,
  filtrarCiudades,
  filtrarPlazas,
  masDisponibilidad,
  resumirCiudades,
  resumirPlazas,
} from "./agregados";
import { FONDO_PREVENTA, FONDO_RANGO } from "./estilo-rango";
import { ListaPlazas } from "./lista-plazas";
import { MasDisponibilidad, OcupacionPorCiudad } from "./tarjetas-resumen";

const MapaCiudades = dynamic(() => import("./mapa-ciudades"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-text-muted">
      Cargando mapa…
    </div>
  ),
});

type Vista = "MAPA" | "LISTA";

const VISTAS = [
  { valor: "MAPA", etiqueta: "Mapa" },
  { valor: "LISTA", etiqueta: "Lista" },
] as const;

/** Último día del mes anterior a "hoy": base de la variación de ocupación. */
const CORTE_MES_ANTERIOR = (() => {
  const d = new Date(`${DEMO_TODAY.slice(0, 8)}01T12:00:00`);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
})();

const LEYENDA = [
  { fondo: FONDO_RANGO.ALTA, texto: "Ocupación ≥ 90%" },
  { fondo: FONDO_RANGO.MEDIA, texto: "75–89%" },
  { fondo: FONDO_RANGO.BAJA, texto: "< 75%" },
  { fondo: FONDO_PREVENTA, texto: "Nueva / preventa" },
] as const;

const TODOS = "TODOS";

export function Panorama() {
  const { usuario } = useSesion();
  const ciudades = useCiudades().datos;
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const contratos = useContratos().datos;
  const facturas = useFacturas(MES_DEMO).datos;

  const [vista, setVista] = useState<Vista>("MAPA");
  const [estado, setEstado] = useState<string>(TODOS);
  const [soloDisponibilidad, setSoloDisponibilidad] = useState(false);

  const filtro = useMemo(
    () => ({ estado: estado === TODOS ? null : estado, soloDisponibilidad }),
    [estado, soloDisponibilidad],
  );

  const datos = useMemo(() => {
    if (!ciudades || !plazas || !locales) return undefined;
    const porCiudad = resumirCiudades(ciudades, plazas, locales);
    const porPlaza = resumirPlazas(ciudades, plazas, locales);
    return {
      porCiudad,
      porPlaza,
      estados: estadosDe(ciudades),
      operativos: locales.filter(
        (l) => plazas.find((p) => p.id === l.plazaId)?.estatus === "EN_OPERACION",
      ),
    };
  }, [ciudades, plazas, locales]);

  const visibles = useMemo(
    () =>
      datos
        ? {
            ciudades: filtrarCiudades(datos.porCiudad, filtro),
            plazas: filtrarPlazas(datos.porPlaza, filtro),
          }
        : undefined,
    [datos, filtro],
  );

  const nombre = usuario?.nombre.split(" ")[0] ?? "";
  const enPreventa = plazas?.filter((p) => p.estatus === "PREVENTA").length ?? 0;
  const variacion =
    datos && contratos
      ? variacionOcupacion(datos.operativos, contratos, CORTE_MES_ANTERIOR)
      : 0;
  const cobrado = facturas ? montoCobrado(facturas) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`${saludoPorHora()}, ${nombre}`}
        descripcion={`Así van tus ${plazas ? formatNumero(plazas.length) : ""} plazas hoy · ${formatFechaLarga(DEMO_TODAY)}`}
        acciones={
          <>
            <Button variant="outline" onClick={avisarProximaFase}>
              <Download aria-hidden /> Exportar
            </Button>
            <Link
              href="/reportes?vista=asistente"
              className={buttonVariants({ variant: "outline" })}
            >
              <Sparkles aria-hidden /> Pregúntale a tus datos
            </Link>
            <Button onClick={avisarProximaFase}>
              <BarChart3 aria-hidden /> Ver tablero completo
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard
          etiqueta="Plazas"
          valor={plazas ? formatNumero(plazas.length) : "—"}
          subtexto={ciudades ? `en ${formatNumero(ciudades.length)} ciudades` : undefined}
        />
        <KpiCard
          etiqueta="Locales totales"
          valor={locales ? formatNumero(locales.length) : "—"}
          subtexto={`${formatNumero(enPreventa)} plazas en preventa`}
        />
        <KpiCard
          etiqueta="Ocupación (en operación)"
          valor={datos ? formatPorcentaje(ocupacion(datos.operativos)) : "—"}
          delta={
            variacion > 0
              ? {
                  texto: `${formatPuntos(variacion).replace("%", "")} pts vs. ${formatMesCorto(CORTE_MES_ANTERIOR)}`,
                  direccion: "sube",
                }
              : undefined
          }
          subtexto={
            variacion > 0
              ? undefined
              : `sin cambio vs. ${formatMesCorto(CORTE_MES_ANTERIOR)}`
          }
        />
        <KpiCard
          etiqueta="Locales disponibles"
          valor={locales ? formatNumero(localesPorColocar(locales)) : "—"}
          subtexto="incluye plazas nuevas"
        />
        <KpiCard
          etiqueta="Cobranza del mes"
          valor={facturas ? formatMonedaMillones(cobrado) : "—"}
          subtexto={
            facturas ? (
              <>
                <span className="font-medium text-brand-secondary">
                  {formatPorcentaje(porcentajeCobrado(facturas))}
                </span>{" "}
                de lo facturado
              </>
            ) : undefined
          }
        />
        <KpiCard
          etiqueta="Contratos por vencer"
          valor={
            contratos
              ? formatNumero(contratosPorVencer(contratos, DEMO_TODAY).length)
              : "—"
          }
          subtexto="próximos 90 días"
        />
      </KpiRow>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-label="Mapa de plazas"
          className="relative flex min-h-[36rem] flex-col overflow-hidden rounded-xl border border-brand-line bg-card shadow-xs"
        >
          {!visibles ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-text-muted">
              Cargando plazas…
            </div>
          ) : vista === "MAPA" ? (
            <MapaCiudades ciudades={visibles.ciudades} />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ListaPlazas plazas={visibles.plazas} />
            </div>
          )}
          <div
            className={cn(
              "z-[1000] flex flex-wrap items-start justify-between gap-2",
              vista === "MAPA" ? "absolute inset-x-4 top-4" : "order-first p-4",
            )}
          >
            <PillsFiltro
              etiqueta="Filtrar por estado"
              opciones={[
                { valor: TODOS, etiqueta: "Todas las ciudades" },
                ...(datos?.estados ?? []).map((e) => ({ valor: e, etiqueta: e })),
              ]}
              valor={estado}
              onChange={setEstado}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={soloDisponibilidad}
                onClick={() => setSoloDisponibilidad((v) => !v)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap shadow-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  soloDisponibilidad
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-brand-line bg-card text-brand-text hover:bg-brand-cream",
                )}
              >
                <Filter aria-hidden className="size-4" /> Solo con disponibilidad
              </button>
              <SegmentedControl
                etiqueta="Vista de plazas"
                opciones={VISTAS}
                valor={vista}
                onChange={setVista}
                className="shadow-xs"
              />
            </div>
          </div>
          {vista === "MAPA" ? (
            <ul className="absolute bottom-4 left-4 z-[1000] flex items-center gap-4 rounded-xl bg-card px-4 py-2.5 text-sm text-brand-text shadow-md">
              {LEYENDA.map((l) => (
                <li key={l.texto} className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2.5 rounded-full", l.fondo)} />
                  {l.texto}
                </li>
              ))}
              <li className="border-l border-brand-line pl-4">
                <Link
                  href="/mapa-de-plazas"
                  className="flex items-center gap-1.5 font-medium text-brand-primary hover:text-brand-secondary"
                >
                  <Maximize2 aria-hidden className="size-3.5" /> Mapa completo
                </Link>
              </li>
            </ul>
          ) : null}
        </section>

        <div className="space-y-6">
          <OcupacionPorCiudad ciudades={visibles?.ciudades ?? []} />
          <MasDisponibilidad plazas={masDisponibilidad(visibles?.plazas ?? [], 6)} />
        </div>
      </div>
    </div>
  );
}
