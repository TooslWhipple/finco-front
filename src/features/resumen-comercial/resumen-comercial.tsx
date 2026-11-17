"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { ArrowRight, FileSearch } from "lucide-react";
import {
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { clientesMorosos, DEMO_TODAY } from "@/domain";
import { ClientesMorosos } from "@/features/cobranza/clientes-morosos";
import { useContextoMantenimiento } from "@/features/mantenimientos/contexto";
import { PanelPresupuestos } from "@/features/mantenimientos/panel-presupuestos";
import { reporteOcupacionPlan } from "@/features/reportes/calculos";
import { columnasDe } from "@/features/reportes/reportes";
import { useDatosReporte } from "@/features/reportes/use-datos-reporte";
import { useMantenimientos } from "@/hooks";
import {
  formatFechaLarga,
  formatMoneda,
  formatNumero,
  formatPorcentaje,
} from "@/lib/format";
import { resumenComercial } from "./agregados";

const RUTA_OCUPACION_PLAN = "/reportes?reporte=OCUPACION_PLAN";
const RUTA_COBRANZA = "/reportes?reporte=COBRANZA";

/** Columnas secundarias de "Ocupación y plan" que se ocultan en vertical (iPad a 820). */
const OCULTAS_EN_VERTICAL = ["porColocar", "enCotizacion", "meta"] as const;

const CLASE_ENLACE =
  "inline-flex items-center gap-1 rounded-sm hover:text-brand-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Tarjeta de KPI que abre el reporte con el detalle de su cifra. */
function KpiEnlace({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block h-full rounded-xl transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

function EnlaceReporte({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={CLASE_ENLACE}>
      {children} <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/**
 * Inicio gerencial de Comercial: plazas, ocupación, plan de ingresos, mantenimiento y
 * clientes que se demoran, en solo lectura. Las cifras salen de las mismas funciones
 * que Reportes, Mapa de plazas y Mantenimientos.
 */
export function ResumenComercial() {
  const datos = useDatosReporte();
  const mantenimientos = useMantenimientos().datos;
  const contexto = useContextoMantenimiento();

  const resumen = useMemo(
    () => (datos ? resumenComercial(datos, mantenimientos) : undefined),
    [datos, mantenimientos],
  );
  const ocupacionPlan = useMemo(
    () => (datos ? reporteOcupacionPlan(datos) : undefined),
    [datos],
  );
  const columnas = useMemo(
    () => (ocupacionPlan ? columnasDe(ocupacionPlan) : []),
    [ocupacionPlan],
  );
  const morosos = useMemo(
    () => (datos ? clientesMorosos(datos.facturas, datos.hoy) : []),
    [datos],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Resumen comercial"
        descripcion={`Ocupación, plan de ingresos, mantenimiento y cobranza de tus plazas · ${formatFechaLarga(DEMO_TODAY)}`}
      />

      <KpiRow>
        <KpiEnlace href={RUTA_OCUPACION_PLAN}>
          <KpiCard
            className="h-full"
            etiqueta="Plazas en operación"
            valor={resumen ? formatNumero(resumen.plazas) : "—"}
            subtexto={
              resumen ? `${formatNumero(resumen.enPreventa)} en preventa` : undefined
            }
          />
        </KpiEnlace>
        <KpiEnlace href={RUTA_OCUPACION_PLAN}>
          <KpiCard
            className="h-full"
            etiqueta="Ocupación (en operación)"
            valor={resumen ? formatPorcentaje(resumen.ocupacion) : "—"}
            subtexto="locales rentados"
          />
        </KpiEnlace>
        <KpiEnlace href={RUTA_OCUPACION_PLAN}>
          <KpiCard
            className="h-full"
            etiqueta="Locales sin abrir"
            valor={resumen ? formatNumero(resumen.localesSinAbrir) : "—"}
            subtexto="rentados, sin apertura"
            tono={resumen && resumen.localesSinAbrir > 0 ? "alerta" : "neutro"}
            detalle={
              resumen && resumen.localesSinAbrir > 0 ? "Requieren seguimiento" : undefined
            }
          />
        </KpiEnlace>
        <KpiEnlace href={RUTA_OCUPACION_PLAN}>
          <KpiCard
            className="h-full"
            etiqueta="Cumplimiento del plan"
            valor={resumen ? formatPorcentaje(resumen.cumplimiento) : "—"}
            subtexto="renta contratada vs. planeada"
          />
        </KpiEnlace>
        <KpiEnlace href={RUTA_COBRANZA}>
          <KpiCard
            className="h-full"
            etiqueta="Cartera vencida"
            valor={resumen ? formatMoneda(resumen.carteraVencida) : "—"}
            subtexto={`${formatNumero(morosos.length)} clientes con atraso`}
          />
        </KpiEnlace>
        <KpiCard
          etiqueta="Sobregiros de mantenimiento"
          valor={resumen ? formatNumero(resumen.sobregirosPendientes) : "—"}
          subtexto="esperan a Dirección"
          tono={resumen && resumen.sobregirosPendientes > 0 ? "alerta" : "neutro"}
          detalle={
            resumen && resumen.sobregirosPendientes > 0
              ? "Sin iniciar hasta autorizarse"
              : undefined
          }
        />
      </KpiRow>

      <SectionCard
        titulo="Ocupación y plan por plaza"
        extra={<EnlaceReporte href={RUTA_OCUPACION_PLAN}>ver reporte</EnlaceReporte>}
        sinPadding
      >
        {ocupacionPlan ? (
          <>
            <p className="px-5 pb-3 text-sm text-brand-text-muted">
              {ocupacionPlan.resumen}
            </p>
            <DataTable
              columns={columnas}
              data={ocupacionPlan.tabla.filas}
              tamanoPagina={10}
              ocultarEnVertical={OCULTAS_EN_VERTICAL}
              vacio={
                <EmptyState
                  icono={FileSearch}
                  titulo="Sin plazas en operación"
                  descripcion="No hay plazas en operación para mostrar."
                />
              }
            />
          </>
        ) : null}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelPresupuestos contexto={contexto} soloLectura />
        <div className="flex min-w-0 flex-col gap-2">
          <ClientesMorosos morosos={morosos} soloLectura />
          <p className="self-end text-sm text-brand-text-muted">
            <EnlaceReporte href={RUTA_COBRANZA}>
              ver cobranza y antigüedad de saldos
            </EnlaceReporte>
          </p>
        </div>
      </div>
    </div>
  );
}
