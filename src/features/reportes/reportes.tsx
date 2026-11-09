"use client";

import { useMemo, useState } from "react";
import { Download, FileSearch, Share2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  BarraFiltros,
  DataTable,
  EmptyState,
  PageHeader,
  PillsFiltro,
  SectionCard,
  SegmentedControl,
  SelectorPill,
  type OpcionPill,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DEMO_TODAY } from "@/domain";
import {
  useCiudades,
  useContratosVivos,
  useCotizaciones,
  useExcepciones,
  useFacturas,
  useLocales,
  useLocatarios,
  usePlazas,
  useProspectos,
  useTerrenos,
} from "@/hooks";
import { MES_DEMO } from "@/lib/tiempo";
import { AsistenteDatos } from "./asistente-datos";
import { FILTRO_INICIAL, REPORTES, TODOS, acotarDatos, type IdReporte } from "./calculos";
import { tablaACsv } from "./csv";
import { formatearValor } from "./formato";
import { GraficaBarras } from "./grafica-barras";
import type { Celda, DatosReporte, FiltroReporte, ResultadoReporte } from "./tipos";

export type VistaReportes = "REPORTES" | "ASISTENTE";

const VISTAS = [
  { valor: "REPORTES", etiqueta: "Reportes" },
  { valor: "ASISTENTE", etiqueta: "Pregúntale a tus datos" },
] as const;

function descargarCsv(nombre: string, contenido: string): void {
  // El BOM hace que Excel abra los acentos en UTF-8.
  const blob = new Blob(["﻿", contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombre}.csv`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function columnasDe(resultado: ResultadoReporte): ColumnDef<Record<string, Celda>>[] {
  return resultado.tabla.columnas.map((c) => ({
    id: c.clave,
    header: c.etiqueta,
    accessorFn: (fila) => fila[c.clave],
    cell: ({ row }) => (
      <span className={c.formato ? "tabular-nums" : undefined}>
        {formatearValor(row.original[c.clave] ?? "", c.formato)}
      </span>
    ),
  }));
}

export function Reportes({
  vistaInicial = "REPORTES",
}: {
  vistaInicial?: VistaReportes;
}) {
  const ciudades = useCiudades().datos;
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const contratos = useContratosVivos().datos;
  const facturas = useFacturas(MES_DEMO).datos;
  const prospectos = useProspectos().datos;
  const terrenos = useTerrenos().datos;
  const locatarios = useLocatarios().datos;
  const cotizaciones = useCotizaciones();
  const excepciones = useExcepciones();

  const [vista, setVista] = useState<VistaReportes>(vistaInicial);
  const [idReporte, setIdReporte] = useState<IdReporte>(REPORTES[0]!.id);
  const [filtro, setFiltro] = useState<FiltroReporte>(FILTRO_INICIAL);

  const datos = useMemo<DatosReporte | undefined>(
    () =>
      ciudades && plazas && locales && contratos && facturas && locatarios
        ? {
            ciudades,
            plazas,
            locales,
            contratos,
            facturas,
            prospectos,
            terrenos,
            locatarios,
            cotizaciones,
            excepciones,
            hoy: DEMO_TODAY,
          }
        : undefined,
    [
      ciudades,
      plazas,
      locales,
      contratos,
      facturas,
      prospectos,
      terrenos,
      locatarios,
      cotizaciones,
      excepciones,
    ],
  );

  const definicion = REPORTES.find((r) => r.id === idReporte) ?? REPORTES[0]!;
  const resultado = useMemo(
    () => (datos ? definicion.calcular(acotarDatos(datos, filtro)) : undefined),
    [datos, definicion, filtro],
  );
  const columnas = useMemo(() => (resultado ? columnasDe(resultado) : []), [resultado]);

  const opcionesReporte: OpcionPill<IdReporte>[] = REPORTES.map((r) => ({
    valor: r.id,
    etiqueta: r.titulo,
  }));
  const opcionesCiudad = [
    { valor: TODOS, etiqueta: "Todas las ciudades" },
    ...(ciudades ?? [])
      .filter((c) => plazas?.some((p) => p.ciudadId === c.id))
      .map((c) => ({ valor: c.id, etiqueta: c.nombre })),
  ];
  const opcionesPlaza = [
    { valor: TODOS, etiqueta: "Todas las plazas" },
    ...(plazas ?? [])
      .filter((p) => filtro.ciudadId === TODOS || p.ciudadId === filtro.ciudadId)
      .map((p) => ({ valor: p.id, etiqueta: p.nombre })),
  ];

  const drilldown = definicion.drilldown;
  const abrirPlaza = (fila: Record<string, Celda>) => {
    const plazaId = drilldown ? fila[drilldown.clavePlaza] : undefined;
    if (!drilldown || typeof plazaId !== "string") return;
    const ciudadId = plazas?.find((p) => p.id === plazaId)?.ciudadId ?? TODOS;
    setFiltro({ ciudadId, plazaId });
    setIdReporte(drilldown.destino);
  };

  const exportar = () => {
    if (!resultado) return;
    descargarCsv(definicion.archivo, tablaACsv(resultado.tabla));
    toast.success("CSV descargado");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reportes"
        descripcion="Ocupación, cobranza, precios, rentas, excepciones, prospectos, contratos y terrenos con gráfica y tabla."
        acciones={
          vista === "REPORTES" ? (
            <>
              <Button variant="outline" onClick={exportar} disabled={!resultado}>
                <Download aria-hidden /> Exportar CSV
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.success("Reporte compartido", {
                    description: `${definicion.titulo}: enlace enviado (simulado).`,
                  })
                }
              >
                <Share2 aria-hidden /> Compartir reporte
              </Button>
            </>
          ) : undefined
        }
      />

      <SegmentedControl
        etiqueta="Vista de reportes"
        opciones={VISTAS}
        valor={vista}
        onChange={setVista}
      />

      {vista === "ASISTENTE" ? (
        datos ? (
          <AsistenteDatos datos={datos} />
        ) : null
      ) : (
        <>
          <BarraFiltros
            envolver
            derecha={
              <>
                <SelectorPill
                  etiqueta="Ciudad"
                  valor={filtro.ciudadId}
                  opciones={opcionesCiudad}
                  onChange={(ciudadId) => setFiltro({ ciudadId, plazaId: TODOS })}
                />
                <SelectorPill
                  etiqueta="Plaza"
                  valor={filtro.plazaId}
                  opciones={opcionesPlaza}
                  onChange={(plazaId) => setFiltro((f) => ({ ...f, plazaId }))}
                />
              </>
            }
          >
            <PillsFiltro
              etiqueta="Reporte"
              opciones={opcionesReporte}
              valor={idReporte}
              onChange={setIdReporte}
              envolver
            />
          </BarraFiltros>

          {resultado ? (
            <>
              <SectionCard titulo={definicion.titulo}>
                <p className="mb-4 text-sm text-brand-text-muted">
                  {definicion.descripcion}
                </p>
                <p className="mb-4 text-sm font-medium text-brand-text">
                  {resultado.resumen}
                </p>
                <GraficaBarras
                  grafica={resultado.grafica}
                  etiqueta={`Gráfica: ${definicion.titulo}`}
                />
              </SectionCard>
              <SectionCard titulo="Detalle">
                <DataTable
                  columns={columnas}
                  data={resultado.tabla.filas}
                  tamanoPagina={10}
                  onFilaClick={drilldown ? abrirPlaza : undefined}
                  vacio={
                    <EmptyState
                      icono={FileSearch}
                      titulo="Sin resultados"
                      descripcion="No hay datos para este reporte con el alcance elegido."
                    />
                  }
                />
              </SectionCard>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
