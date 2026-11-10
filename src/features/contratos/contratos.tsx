"use client";

import { useMemo, useState } from "react";
import { FileX } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BarraFiltros,
  DataTable,
  TablaConDetalle,
  EmptyState,
  ESTATUS,
  KpiCard,
  KpiRow,
  MoneyAmount,
  PageHeader,
  PillsFiltro,
  SectionCard,
  SelectorPill,
  StatusChip,
} from "@/components/shared";
import { can } from "@/config/permissions";
import {
  DEMO_TODAY,
  ESTADOS_VISIBLES_CONTRATO,
  estadoVisibleContrato,
  type Contrato,
} from "@/domain";
import { VistaPreviaContrato } from "@/features/cotizacion/vista-previa-contrato";
import {
  useCiudades,
  useContratosVivos,
  useTodasLasCotizaciones,
  useLocales,
  useLocatarios,
  usePlazas,
  useProspectos,
  useSesion,
} from "@/hooks";
import { formatFecha, formatMoneda, formatNumero } from "@/lib/format";
import { AHORA_DEMO } from "@/lib/tiempo";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  FILTRO_INICIAL,
  TODOS,
  VENCIMIENTOS,
  diasParaVencer,
  filtrarContratos,
  kpisContratos,
} from "./agregados";
import { DetalleContrato } from "./detalle-contrato";

interface ContratosProps {
  /** Contrato abierto al entrar (llega de vencimientos, buscador o cotización). */
  contratoInicialId?: string;
}

export function Contratos({ contratoInicialId }: ContratosProps) {
  const { rol } = useSesion();
  const contratos = useContratosVivos().datos;
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const locatarios = useLocatarios().datos;
  const ciudades = useCiudades().datos;
  const prospectos = useProspectos().datos;
  const cotizaciones = useTodasLasCotizaciones();
  const enviarContratoAFirma = useAppStore((s) => s.enviarContratoAFirma);
  const registrarFirmaContrato = useAppStore((s) => s.registrarFirmaContrato);

  const [filtro, setFiltro] = useState(FILTRO_INICIAL);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    contratoInicialId ?? null,
  );

  const lista = useMemo(() => contratos ?? [], [contratos]);
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
  // Un contrato en trámite aún no tiene locatario del catálogo: su "locatario" es el prospecto.
  const nombres = useMemo(
    () =>
      new Map([
        ...prospectos.map((p) => [p.id, p.nombre] as const),
        ...(locatarios ?? []).map((l) => [l.id, l.nombre] as const),
      ]),
    [locatarios, prospectos],
  );
  const nombreDe = (c: Contrato) =>
    nombres.get(c.locatarioId) ??
    cotizaciones.find((q) => q.id === c.cotizacionId)?.prospecto.nombre ??
    "Locatario";

  const visibles = useMemo(
    () => filtrarContratos(lista, filtro, plazaDeLocal, DEMO_TODAY),
    [lista, filtro, plazaDeLocal],
  );
  const kpis = useMemo(() => kpisContratos(lista, DEMO_TODAY), [lista]);
  const seleccionado = lista.find((c) => c.id === seleccionadoId);
  const cotizacionSel = seleccionado
    ? cotizaciones.find((q) => q.id === seleccionado.cotizacionId)
    : undefined;
  const localSel = seleccionado ? localesPorId.get(seleccionado.localId) : undefined;
  const plazaSel = localSel ? plazasPorId.get(localSel.plazaId) : undefined;
  const ciudadSel = (ciudades ?? []).find((c) => c.id === plazaSel?.ciudadId);
  const puedeGestionar = can(rol, "contratos.gestionar");

  const columnas = useMemo<ColumnDef<Contrato>[]>(
    () => [
      {
        id: "contrato",
        header: "Contrato",
        accessorFn: (c) => c.folio ?? c.id,
        cell: ({ row }) => (
          <span className="font-medium text-brand-primary">
            {row.original.folio ?? row.original.id}
          </span>
        ),
      },
      {
        id: "locatario",
        header: "Locatario",
        accessorFn: (c) => nombres.get(c.locatarioId) ?? "Locatario",
      },
      {
        id: "local",
        header: "Local",
        accessorFn: (c) => {
          const local = localesPorId.get(c.localId);
          return local
            ? `${plazasPorId.get(local.plazaId)?.nombre ?? ""} · ${local.codigo}`
            : c.localId;
        },
      },
      {
        id: "estado",
        header: "Estado",
        accessorFn: (c) =>
          ESTADOS_VISIBLES_CONTRATO.indexOf(estadoVisibleContrato(c, DEMO_TODAY)),
        cell: ({ row }) => (
          <StatusChip estatus={estadoVisibleContrato(row.original, DEMO_TODAY)} />
        ),
      },
      {
        id: "fin",
        header: "Vence",
        accessorFn: (c) => c.fin,
        cell: ({ row }) => formatFecha(row.original.fin),
      },
      {
        id: "dias",
        header: "Días",
        accessorFn: (c) => diasParaVencer(c, DEMO_TODAY),
        cell: ({ row }) =>
          row.original.estado === "VIGENTE" ? (
            <span
              className={cn(
                "tabular-nums",
                diasParaVencer(row.original, DEMO_TODAY) <= 90 &&
                  "font-medium text-brand-coral",
              )}
            >
              {diasParaVencer(row.original, DEMO_TODAY)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "renta",
        header: "Renta mensual",
        accessorFn: (c) => c.rentaMensual,
        cell: ({ row }) => <MoneyAmount valor={row.original.rentaMensual} />,
      },
    ],
    [nombres, localesPorId, plazasPorId],
  );

  const conteoEstado = (estado: string) =>
    filtrarContratos(lista, { ...filtro, estado }, plazaDeLocal, DEMO_TODAY).length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Contratos"
        descripcion="Del borrador a la firma y la vigencia: seguimiento de cada contrato."
      />
      {!puedeGestionar ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Los contratos los gestiona Ventas.
        </p>
      ) : null}

      <KpiRow>
        <KpiCard
          etiqueta="Contratos vigentes"
          valor={formatNumero(kpis.vigentes)}
          subtexto="incluye los por vencer"
        />
        <KpiCard
          etiqueta="Por vencer"
          valor={formatNumero(kpis.porVencer)}
          subtexto="vencen en 90 días"
        />
        <KpiCard
          etiqueta="En firma"
          valor={formatNumero(kpis.enFirma)}
          subtexto="esperan la firma"
        />
        <KpiCard
          etiqueta="Renta mensual contratada"
          valor={formatMoneda(kpis.rentaMensual)}
          subtexto="de los contratos vigentes"
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
              etiqueta="Filtrar por vencimiento"
              valor={filtro.vencimiento}
              opciones={[
                { valor: TODOS, etiqueta: "Cualquier vencimiento" },
                ...VENCIMIENTOS,
              ].map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
              onChange={(vencimiento) => setFiltro((f) => ({ ...f, vencimiento }))}
            />
          </>
        }
      >
        <PillsFiltro
          etiqueta="Filtrar por estado"
          valor={filtro.estado}
          onChange={(estado) => setFiltro((f) => ({ ...f, estado }))}
          opciones={[
            { valor: TODOS, etiqueta: "Todos", conteo: conteoEstado(TODOS) },
            ...ESTADOS_VISIBLES_CONTRATO.map((estado) => ({
              valor: estado,
              etiqueta: ESTATUS[estado].etiqueta,
              conteo: conteoEstado(estado),
            })),
          ]}
        />
      </BarraFiltros>

      <TablaConDetalle
        anchoPanel="26rem"
        etiqueta="Detalle del contrato"
        onCerrar={() => setSeleccionadoId(null)}
        lista={
          <SectionCard
            titulo={`Contratos (${formatNumero(visibles.length)})`}
            className="min-w-0"
          >
            {visibles.length === 0 ? (
              <EmptyState
                icono={FileX}
                titulo="Sin contratos con estos filtros"
                descripcion="Quita un filtro para ver más contratos."
              />
            ) : (
              <DataTable
                columns={columnas}
                data={visibles}
                tamanoPagina={12}
                ocultarEnVertical={["fin", "dias"]}
                onFilaClick={(c) => setSeleccionadoId(c.id)}
              />
            )}
          </SectionCard>
        }
        detalle={
          seleccionado ? (
            <div className="min-w-0 space-y-6">
              <DetalleContrato
                contrato={seleccionado}
                hoy={DEMO_TODAY}
                locatario={nombreDe(seleccionado)}
                local={localSel}
                plaza={plazaSel}
                cotizacion={cotizacionSel}
                puedeGestionar={puedeGestionar}
                onEnviarAFirma={enviarContratoAFirma}
                onRegistrarFirma={(id) => registrarFirmaContrato(id, AHORA_DEMO)}
                onCerrar={() => setSeleccionadoId(null)}
              />
              {cotizacionSel && localSel && plazaSel ? (
                <VistaPreviaContrato
                  cotizacion={cotizacionSel}
                  local={localSel}
                  plaza={plazaSel}
                  ciudad={ciudadSel}
                  folioContrato={seleccionado.folio ?? seleccionado.id}
                  contratoGenerado
                />
              ) : null}
            </div>
          ) : null
        }
      />
    </div>
  );
}
