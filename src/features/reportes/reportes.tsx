"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { can } from "@/config/permissions";
import { IDS_VENDEDORES, nombreDeUsuario } from "@/config/usuarios";
import type { Rol } from "@/domain";
import { useCiudades, usePlazas, useSesion } from "@/hooks";
import { formatLista } from "@/lib/format";
import { AsistenteDatos } from "./asistente-datos";
import { FILTRO_INICIAL, REPORTES, TODOS, acotarDatos, type IdReporte } from "./calculos";
import { tablaACsv } from "./csv";
import { formatearValor } from "./formato";
import { GraficaBarras } from "./grafica-barras";
import type { Celda, FiltroReporte, ResultadoReporte } from "./tipos";
import { useDatosReporte } from "./use-datos-reporte";

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

export function columnasDe(
  resultado: ResultadoReporte,
): ColumnDef<Record<string, Celda>>[] {
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

/** Qué cubren los reportes, sin mencionar cobranza ni terrenos al rol que no los ve. */
function descripcionReportes(rol: Rol | null): string {
  const temas = [
    "ocupación",
    ...(can(rol, "cobranza.ver") ? ["cobranza"] : []),
    "precios",
    "rentas",
    "excepciones",
    "prospectos",
    "contratos",
    ...(can(rol, "terrenos.ver") ? ["terrenos"] : []),
  ];
  const texto = formatLista(temas);
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} con gráfica y tabla.`;
}

/** Valor de `?vista=` que abre el asistente; sin él, la vista de reportes. */
const PARAM_ASISTENTE = "asistente";

/**
 * Pantalla de Reportes. La vista (`?vista=asistente`) y el reporte (`?reporte=<id>`)
 * viven en la URL: un enlace manda aunque la pantalla siga montada de una visita
 * anterior. Un reporte desconocido o que el rol no ve abre el primero disponible.
 */
export function Reportes() {
  const ruta = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { rol } = useSesion();
  const ciudades = useCiudades().datos;
  const plazas = usePlazas().datos;
  const datos = useDatosReporte();

  const vista: VistaReportes =
    params.get("vista") === PARAM_ASISTENTE ? "ASISTENTE" : "REPORTES";
  const [filtro, setFiltro] = useState<FiltroReporte>(FILTRO_INICIAL);

  const disponibles = useMemo(
    () => REPORTES.filter((r) => !r.requiere || can(rol, r.requiere)),
    [rol],
  );
  const idPedido = params.get("reporte");
  const definicion = disponibles.find((r) => r.id === idPedido) ?? disponibles[0]!;

  function irA(vistaNueva: VistaReportes, reporte: IdReporte) {
    const consulta = new URLSearchParams({ reporte });
    if (vistaNueva === "ASISTENTE") consulta.set("vista", PARAM_ASISTENTE);
    router.push(`${ruta}?${consulta.toString()}`, { scroll: false });
  }
  const resultado = useMemo(
    () => (datos ? definicion.calcular(acotarDatos(datos, filtro)) : undefined),
    [datos, definicion, filtro],
  );
  const columnas = useMemo(() => (resultado ? columnasDe(resultado) : []), [resultado]);

  const opcionesReporte: OpcionPill<IdReporte>[] = disponibles.map((r) => ({
    valor: r.id,
    etiqueta: r.titulo,
  }));
  const opcionesCiudad = [
    { valor: TODOS, etiqueta: "Todas las ciudades" },
    ...(ciudades ?? [])
      .filter((c) => plazas?.some((p) => p.ciudadId === c.id))
      .map((c) => ({ valor: c.id, etiqueta: c.nombre })),
  ];
  const opcionesVendedor = [
    { valor: TODOS, etiqueta: "Todos los vendedores" },
    ...IDS_VENDEDORES.map((id) => ({ valor: id, etiqueta: nombreDeUsuario(id) })),
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
    irA(vista, drilldown.destino);
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
        descripcion={descripcionReportes(rol)}
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
        onChange={(v) => irA(v, definicion.id)}
      />

      {vista === "ASISTENTE" ? (
        datos ? (
          <AsistenteDatos datos={datos} rol={rol} />
        ) : null
      ) : (
        <>
          <BarraFiltros
            envolver
            derecha={
              <>
                {definicion.id === "OFERTAS_VENDEDOR" ? (
                  <SelectorPill
                    etiqueta="Vendedor"
                    valor={filtro.vendedorId ?? TODOS}
                    opciones={opcionesVendedor}
                    onChange={(vendedorId) => setFiltro((f) => ({ ...f, vendedorId }))}
                  />
                ) : null}
                <SelectorPill
                  etiqueta="Ciudad"
                  valor={filtro.ciudadId}
                  opciones={opcionesCiudad}
                  onChange={(ciudadId) =>
                    setFiltro((f) => ({ ...f, ciudadId, plazaId: TODOS }))
                  }
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
              valor={definicion.id}
              onChange={(id) => {
                irA(vista, id);
                setFiltro((f) => ({ ...f, plazaId: TODOS }));
              }}
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
