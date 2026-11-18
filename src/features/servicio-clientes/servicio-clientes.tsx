"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Headset, Plus } from "lucide-react";
import {
  BarraFiltros,
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  SectionCard,
  SegmentedControl,
  SelectorPill,
  StatusChip,
  TablaConDetalle,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  ESTATUS_CASO,
  ETIQUETA_ESTATUS_CASO,
  ETIQUETA_PRIORIDAD_CASO,
  ETIQUETA_TIPO_CASO,
  estadisticaPorCliente,
  estadoMeta,
  kpisCasos,
  nombreLocatario,
  PRIORIDADES_CASO,
  type CasoServicio,
  type EstadisticaCliente,
  type EstatusCaso,
  type PrioridadCaso,
} from "@/domain";
import { useCasos, useFuentesLocatario, useLocales, usePlazas, useSesion } from "@/hooks";
import { formatFecha, formatHoras, formatNumero, formatPorcentaje } from "@/lib/format";
import { AHORA_DEMO } from "@/lib/tiempo";
import { DetalleCaso } from "./detalle-caso";
import { DialogoCaso } from "./dialogo-caso";

const TODOS = "TODOS";

type Vista = "BANDEJA" | "POR_CLIENTE";

const VISTAS = [
  { valor: "BANDEJA", etiqueta: "Bandeja" },
  { valor: "POR_CLIENTE", etiqueta: "Por cliente" },
] as const;

interface Filtro {
  estatus: typeof TODOS | EstatusCaso;
  prioridad: typeof TODOS | PrioridadCaso;
}

const FILTRO_INICIAL: Filtro = { estatus: TODOS, prioridad: TODOS };

const SIN_DATO = "—";

const fraccion = (valor: number | null) =>
  valor === null ? SIN_DATO : formatPorcentaje(valor);
const horas = (valor: number | null) => (valor === null ? SIN_DATO : formatHoras(valor));
const calificacion = (valor: number | null) =>
  valor === null ? SIN_DATO : `${formatNumero(Math.round(valor * 10) / 10)} de 5`;

/**
 * Servicio a clientes: bandeja de casos de locatarios con su meta de primera
 * respuesta, estadística por cliente y KPIs de los últimos 30 días. La lectura
 * la da la regla de ruta; registrar y gestionar casos exige `casos.gestionar`.
 */
export function ServicioClientes() {
  const { rol } = useSesion();
  const casos = useCasos();
  const fuentes = useFuentesLocatario();
  const locales = useLocales().datos;
  const plazas = usePlazas().datos;
  const puedeGestionar = can(rol, "casos.gestionar");

  const [vista, setVista] = useState<Vista>("BANDEJA");
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_INICIAL);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);

  const ubicacion = useMemo(() => {
    const codigo = new Map((locales ?? []).map((l) => [l.id, l.codigo]));
    const plaza = new Map((plazas ?? []).map((p) => [p.id, p.nombre]));
    return (c: Pick<CasoServicio, "localId" | "plazaId">) =>
      `${codigo.get(c.localId) ?? c.localId} · ${plaza.get(c.plazaId) ?? c.plazaId}`;
  }, [locales, plazas]);
  const locatario = useMemo(
    () => (id: string) => nombreLocatario(id, fuentes),
    [fuentes],
  );

  const kpis = useMemo(() => kpisCasos(casos, AHORA_DEMO), [casos]);
  const estadistica = useMemo(() => estadisticaPorCliente(casos, AHORA_DEMO), [casos]);
  const visibles = useMemo(
    () =>
      casos
        .filter(
          (c) =>
            (filtro.estatus === TODOS || c.estatus === filtro.estatus) &&
            (filtro.prioridad === TODOS || c.prioridad === filtro.prioridad),
        )
        .sort((a, b) => b.abiertoEl.localeCompare(a.abiertoEl)),
    [casos, filtro],
  );
  const seleccionado = casos.find((c) => c.id === seleccionadoId);

  const columnasBandeja = useMemo<ColumnDef<CasoServicio>[]>(
    () => [
      {
        id: "folio",
        header: "Folio",
        accessorFn: (c) => c.abiertoEl,
        cell: ({ row }) => (
          <span className="block">
            <span className="block font-medium text-brand-primary">
              {row.original.folio}
            </span>
            <span className="block text-xs text-brand-text-muted">
              {formatFecha(row.original.abiertoEl.slice(0, 10))}
            </span>
          </span>
        ),
      },
      {
        id: "locatario",
        header: "Locatario",
        accessorFn: (c) => locatario(c.locatarioId),
      },
      { id: "local", header: "Local", accessorFn: ubicacion },
      { id: "tipo", header: "Tipo", accessorFn: (c) => ETIQUETA_TIPO_CASO[c.tipo] },
      {
        id: "prioridad",
        header: "Prioridad",
        accessorFn: (c) => PRIORIDADES_CASO.indexOf(c.prioridad),
        cell: ({ row }) => ETIQUETA_PRIORIDAD_CASO[row.original.prioridad],
      },
      {
        id: "estatus",
        header: "Estatus",
        accessorFn: (c) => ESTATUS_CASO.indexOf(c.estatus),
        cell: ({ row }) => <StatusChip estatus={row.original.estatus} />,
      },
      {
        id: "meta",
        header: "Meta de respuesta",
        accessorFn: (c) => estadoMeta(c, AHORA_DEMO),
        cell: ({ row }) => <StatusChip estatus={estadoMeta(row.original, AHORA_DEMO)} />,
      },
    ],
    [locatario, ubicacion],
  );

  const columnasCliente = useMemo<ColumnDef<EstadisticaCliente>[]>(
    () => [
      {
        id: "locatario",
        header: "Locatario",
        accessorFn: (e) => locatario(e.locatarioId),
      },
      {
        id: "total",
        header: "Casos",
        accessorFn: (e) => e.total,
        cell: ({ row }) => formatNumero(row.original.total),
      },
      {
        id: "abiertos",
        header: "Abiertos",
        accessorFn: (e) => e.abiertos,
        cell: ({ row }) => formatNumero(row.original.abiertos),
      },
      {
        id: "enTiempo",
        header: "Respuesta en tiempo",
        accessorFn: (e) => e.fraccionEnTiempo ?? -1,
        cell: ({ row }) => fraccion(row.original.fraccionEnTiempo),
      },
      {
        id: "primeraRespuesta",
        header: "1.ª respuesta prom.",
        accessorFn: (e) => e.horasPrimeraRespuesta ?? -1,
        cell: ({ row }) => horas(row.original.horasPrimeraRespuesta),
      },
      {
        id: "resolucion",
        header: "Resolución prom.",
        accessorFn: (e) => e.horasResolucion ?? -1,
        cell: ({ row }) => horas(row.original.horasResolucion),
      },
      {
        id: "tipoFrecuente",
        header: "Tipo más frecuente",
        accessorFn: (e) =>
          e.tipoFrecuente ? ETIQUETA_TIPO_CASO[e.tipoFrecuente] : SIN_DATO,
      },
      {
        id: "calificacion",
        header: "Calificación prom.",
        accessorFn: (e) => e.calificacionPromedio ?? -1,
        cell: ({ row }) => calificacion(row.original.calificacionPromedio),
      },
    ],
    [locatario],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Servicio a clientes"
        descripcion="Casos que reportan los locatarios (fallas, fugas, daños, aclaraciones y consultas): meta de primera respuesta, seguimiento y estadística por cliente."
        acciones={
          puedeGestionar ? (
            <Button
              onClick={() => setRegistrando(true)}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              <Plus aria-hidden />
              Registrar caso
            </Button>
          ) : undefined
        }
      />
      {!puedeGestionar ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Los casos los registra y atiende Atención a clientes.
        </p>
      ) : null}

      <KpiRow>
        <KpiCard
          etiqueta="Casos recibidos"
          valor={formatNumero(kpis.recibidos)}
          subtexto="Últimos 30 días"
        />
        <KpiCard
          etiqueta="Abiertos"
          valor={formatNumero(kpis.abiertos)}
          subtexto="Últimos 30 días"
        />
        <KpiCard
          etiqueta="Fuera de tiempo"
          valor={formatNumero(kpis.fueraDeTiempo)}
          subtexto="Primera respuesta, últimos 30 días"
          tono={kpis.fueraDeTiempo > 0 ? "peligro" : "neutro"}
        />
        <KpiCard
          etiqueta="Respuesta en tiempo"
          valor={fraccion(kpis.fraccionEnTiempo)}
          subtexto={`1.ª respuesta prom. ${horas(kpis.horasPrimeraRespuesta)} · últimos 30 días`}
        />
        <KpiCard
          etiqueta="Calificación promedio"
          valor={calificacion(kpis.calificacionPromedio)}
          subtexto="Casos cerrados, últimos 30 días"
        />
      </KpiRow>

      <BarraFiltros
        envolver
        derecha={
          <SegmentedControl
            etiqueta="Vista"
            opciones={VISTAS}
            valor={vista}
            onChange={(v) => {
              setVista(v);
              setSeleccionadoId(null);
            }}
          />
        }
      >
        {vista === "BANDEJA" ? (
          <>
            <SelectorPill
              etiqueta="Filtrar por estatus"
              valor={filtro.estatus}
              opciones={[
                { valor: TODOS, etiqueta: "Todos los estatus" },
                ...ESTATUS_CASO.map((e) => ({
                  valor: e,
                  etiqueta: ETIQUETA_ESTATUS_CASO[e],
                })),
              ]}
              onChange={(estatus) =>
                setFiltro((f) => ({ ...f, estatus: estatus as Filtro["estatus"] }))
              }
            />
            <SelectorPill
              etiqueta="Filtrar por prioridad"
              valor={filtro.prioridad}
              opciones={[
                { valor: TODOS, etiqueta: "Todas las prioridades" },
                ...PRIORIDADES_CASO.map((p) => ({
                  valor: p,
                  etiqueta: ETIQUETA_PRIORIDAD_CASO[p],
                })),
              ]}
              onChange={(prioridad) =>
                setFiltro((f) => ({ ...f, prioridad: prioridad as Filtro["prioridad"] }))
              }
            />
          </>
        ) : null}
      </BarraFiltros>

      {vista === "BANDEJA" ? (
        <TablaConDetalle
          anchoPanel="26rem"
          etiqueta="Detalle del caso"
          onCerrar={() => setSeleccionadoId(null)}
          lista={
            <SectionCard
              titulo={`Casos (${formatNumero(visibles.length)})`}
              sinPadding
              className="min-w-0"
            >
              <DataTable
                columns={columnasBandeja}
                data={visibles}
                tamanoPagina={15}
                ocultarEnVertical={["tipo", "local"]}
                onFilaClick={(c) => setSeleccionadoId(c.id)}
                vacio={
                  <EmptyState
                    icono={Headset}
                    titulo="Ningún caso coincide"
                    descripcion="Cambia el estatus o la prioridad."
                  />
                }
              />
            </SectionCard>
          }
          detalle={
            seleccionado ? (
              <DetalleCaso
                caso={seleccionado}
                locatario={locatario(seleccionado.locatarioId)}
                ubicacion={ubicacion(seleccionado)}
                onCerrar={() => setSeleccionadoId(null)}
              />
            ) : null
          }
        />
      ) : (
        <SectionCard
          titulo={`Estadística por cliente (${formatNumero(estadistica.length)})`}
          sinPadding
        >
          <DataTable
            columns={columnasCliente}
            data={estadistica}
            tamanoPagina={15}
            ocultarEnVertical={["resolucion", "tipoFrecuente"]}
            vacio={<EmptyState icono={Headset} titulo="Aún no hay casos registrados" />}
          />
        </SectionCard>
      )}

      {puedeGestionar ? (
        <DialogoCaso abierto={registrando} onCambioAbierto={setRegistrando} />
      ) : null}
    </div>
  );
}
