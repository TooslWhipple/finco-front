"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { ArrowRight, FileSearch, UserX } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { can } from "@/config/permissions";
import { nombreDeUsuario } from "@/config/usuarios";
import { clientesMorosos, DEMO_TODAY, type EtapaProspecto } from "@/domain";
import { ClientesMorosos } from "@/features/cobranza/clientes-morosos";
import { useContextoMantenimiento } from "@/features/mantenimientos/contexto";
import { PanelPresupuestos } from "@/features/mantenimientos/panel-presupuestos";
import { reporteOcupacionPlan } from "@/features/reportes/calculos";
import { columnasDe } from "@/features/reportes/reportes";
import { useDatosReporte } from "@/features/reportes/use-datos-reporte";
import { useMantenimientos, useSesion } from "@/hooks";
import {
  formatFechaLarga,
  formatMoneda,
  formatNumero,
  formatPorcentaje,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { avanceEquipo, resumenComercial, type FilaAvanceEquipo } from "./agregados";

const RUTA_OCUPACION_PLAN = "/reportes?reporte=OCUPACION_PLAN";
const RUTA_COBRANZA = "/reportes?reporte=COBRANZA";

/** Columnas secundarias de "Ocupación y plan" que se ocultan en vertical (iPad a 820). */
const OCULTAS_EN_VERTICAL = ["porColocar", "enCotizacion", "meta"] as const;

const CLASE_ENLACE =
  "inline-flex items-center gap-1 rounded-sm hover:text-brand-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const cantidadEn = (fila: FilaAvanceEquipo, etapa: EtapaProspecto) =>
  fila.porEtapa.find((p) => p.etapa === etapa)?.cantidad ?? 0;

const COLUMNAS_AVANCE: ColumnDef<FilaAvanceEquipo>[] = [
  {
    id: "vendedor",
    header: "Vendedor",
    accessorFn: (f) => (f.usuarioId === null ? "Otros" : nombreDeUsuario(f.usuarioId)),
    cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
  },
  {
    id: "activos",
    header: "Activos",
    accessorFn: (f) => f.porEtapa.reduce((total, p) => total + p.cantidad, 0),
    cell: ({ getValue }) => formatNumero(Number(getValue())),
  },
  {
    id: "negociacion",
    header: "En negociación",
    accessorFn: (f) => cantidadEn(f, "NEGOCIACION"),
    cell: ({ getValue }) => formatNumero(Number(getValue())),
  },
  {
    id: "cotizado",
    header: "Cotizados",
    accessorFn: (f) => cantidadEn(f, "COTIZADO"),
    cell: ({ getValue }) => formatNumero(Number(getValue())),
  },
  {
    id: "frios",
    header: "Fríos",
    accessorFn: (f) => f.frios,
    cell: ({ getValue }) => formatNumero(Number(getValue())),
  },
  {
    id: "ganados30d",
    header: "Ganados (30 días)",
    accessorFn: (f) => f.ganados30d,
    cell: ({ getValue }) => formatNumero(Number(getValue())),
  },
];

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
 * (solo con `cobranza.ver`) cartera vencida y clientes que se demoran, en solo
 * lectura. Las cifras salen de las mismas funciones que Reportes, Mapa de plazas y
 * Mantenimientos.
 */
export function ResumenComercial() {
  const { rol } = useSesion();
  const veCobranza = can(rol, "cobranza.ver");
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
  // Sin guarda propia: la regla de ruta solo deja entrar a quien ve todo el equipo.
  const avance = useMemo(
    () => (datos ? avanceEquipo(datos.prospectos, datos.hoy) : []),
    [datos],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Resumen comercial"
        descripcion={`${veCobranza ? "Ocupación, plan de ingresos, mantenimiento y cobranza" : "Ocupación, plan de ingresos y mantenimiento"} de tus plazas · ${formatFechaLarga(DEMO_TODAY)}`}
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
        {veCobranza ? (
          <KpiEnlace href={RUTA_COBRANZA}>
            <KpiCard
              className="h-full"
              etiqueta="Cartera vencida"
              valor={resumen ? formatMoneda(resumen.carteraVencida) : "—"}
              subtexto={`${formatNumero(morosos.length)} clientes con atraso`}
            />
          </KpiEnlace>
        ) : null}
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

      <SectionCard titulo="Avance del equipo" sinPadding>
        <p className="px-5 pb-3 text-sm text-brand-text-muted">
          Prospectos activos por vendedor, los fríos (30 días o más sin contacto) y los
          ganados en los últimos 30 días.
        </p>
        <DataTable
          columns={COLUMNAS_AVANCE}
          data={avance}
          ocultarEnVertical={["cotizado"]}
          vacio={
            <EmptyState
              icono={UserX}
              titulo="Sin prospectos"
              descripcion="El equipo aún no tiene prospectos registrados."
            />
          }
        />
      </SectionCard>

      <div className={cn("grid gap-6", veCobranza && "lg:grid-cols-2")}>
        <PanelPresupuestos contexto={contexto} soloLectura />
        {veCobranza ? (
          <div className="flex min-w-0 flex-col gap-2">
            <ClientesMorosos morosos={morosos} soloLectura />
            <p className="self-end text-sm text-brand-text-muted">
              <EnlaceReporte href={RUTA_COBRANZA}>
                ver cobranza y antigüedad de saldos
              </EnlaceReporte>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
