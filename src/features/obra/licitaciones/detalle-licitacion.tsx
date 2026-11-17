"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Ayuda,
  DataTable,
  GraficaLineas,
  KpiCard,
  KpiRow,
  MoneyAmount,
  SectionCard,
  StatusChip,
  Timeline,
} from "@/components/shared";
import {
  ETIQUETA_PARTIDA,
  rondaAbierta,
  rondasConPrecios,
  tieneCatalogo,
  type Licitacion,
  type Proveedor,
} from "@/domain";
import { ETIQUETA_CANAL } from "@/features/cobranza/controles-programacion";
import { formatFecha, formatMonedaMillones, formatPorcentaje } from "@/lib/format";
import { ComparativoPorConcepto } from "./comparativo-conceptos";
import {
  nombreProveedor,
  datosGraficaRondas,
  descripcionContraBase,
  eventosDecision,
  matrizProveedores,
  resumenLicitacion,
  type CeldaRonda,
  type FilaProveedor,
} from "./agregados";

function CeldaMonto({ celda }: { celda: CeldaRonda }) {
  switch (celda.tipo) {
    case "MONTO":
      return (
        <span className="block">
          <MoneyAmount
            valor={celda.monto}
            className={celda.esMejor ? "font-semibold text-brand-secondary" : undefined}
          />
          {celda.capturadaPor ? (
            <span className="block text-xs text-brand-text-muted">
              {celda.capturadaPor === "CONTRATISTA"
                ? "Respondió en el portal"
                : "Capturado por PMO"}
            </span>
          ) : null}
        </span>
      );
    case "SIN_RESPUESTA":
      return <StatusChip estatus="SIN_RESPUESTA" />;
    case "POR_RESPONDER":
      return <StatusChip estatus="PENDIENTE" etiqueta="Por responder" />;
    case "DESCARTADO":
      return (
        <Ayuda texto={celda.motivo}>
          <StatusChip estatus="DESCARTADO" />
        </Ayuda>
      );
    case "FUERA":
      return <span className="text-brand-text-muted">—</span>;
  }
}

function columnasProveedores(licitacion: Licitacion): ColumnDef<FilaProveedor>[] {
  const porRonda = licitacion.rondas.map((ronda, i): ColumnDef<FilaProveedor> => ({
    id: `ronda-${ronda.numero}`,
    header:
      ronda.estado === "ABIERTA"
        ? `Ronda ${ronda.numero} · abierta`
        : `Ronda ${ronda.numero}`,
    enableSorting: false,
    cell: ({ row }) => <CeldaMonto celda={row.original.celdas[i]} />,
  }));
  return [
    {
      id: "proveedor",
      header: "Proveedor",
      accessorFn: (f) => f.proveedor.nombre,
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-brand-primary">
            {row.original.proveedor.nombre}
          </span>
          {row.original.esGanador ? (
            <StatusChip estatus="ADJUDICADA" etiqueta="Ganador" />
          ) : null}
        </span>
      ),
    },
    ...porRonda,
  ];
}

interface DetalleLicitacionProps {
  licitacion: Licitacion;
  proveedores: readonly Proveedor[];
}

/** Indicadores, evolución por ronda, tabla de proveedores y decisión de una licitación. */
export function DetalleLicitacion({ licitacion, proveedores }: DetalleLicitacionProps) {
  const resumen = resumenLicitacion(licitacion);
  const enCurso = licitacion.estado === "EN_CURSO";
  const filas = matrizProveedores(licitacion, proveedores);
  const columnas = columnasProveedores(licitacion);
  const conCatalogo = tieneCatalogo(licitacion);
  const abierta = rondaAbierta(licitacion);
  const grafica = datosGraficaRondas(licitacion, proveedores);
  const eventos = eventosDecision(licitacion, proveedores);
  const contraBase = resumen.contraBase && descripcionContraBase(resumen.contraBase);

  return (
    <div className="space-y-6">
      <KpiRow>
        <KpiCard
          etiqueta="Tasa de respuesta"
          valor={`${resumen.respuesta.respondieron} de ${resumen.respuesta.invitados}`}
          subtexto={`${formatPorcentaje(resumen.respuesta.fraccion)} de los invitados respondió`}
        />
        <KpiCard
          etiqueta={
            <Ayuda
              texto={
                enCurso
                  ? "Cuánto bajó la mejor propuesta entre la primera ronda y la más reciente."
                  : "Primera propuesta del ganador menos el monto adjudicado."
              }
            >
              {enCurso ? "Mejora entre rondas" : "Ahorro en negociación"}
            </Ayuda>
          }
          valor={
            resumen.ahorro === undefined ? "—" : formatMonedaMillones(resumen.ahorro)
          }
          tono={
            resumen.ahorro !== undefined && resumen.ahorro > 0 ? "positivo" : "neutro"
          }
          subtexto={
            enCurso
              ? "Mejor oferta, ronda 1 contra la última"
              : "Del primer precio al final"
          }
        />
        <KpiCard
          etiqueta={
            <Ayuda texto="Compara la oferta contra el presupuesto base interno de la partida.">
              {enCurso ? "Mejor propuesta contra el base" : "Adjudicado contra el base"}
            </Ayuda>
          }
          valor={
            resumen.montoReferencia === undefined
              ? "—"
              : formatMonedaMillones(resumen.montoReferencia)
          }
          subtexto={`Base: ${formatMonedaMillones(licitacion.presupuestoBase)}`}
          detalle={contraBase?.texto}
          tono={contraBase?.tono}
        />
      </KpiRow>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <SectionCard
            titulo={`Evolución por ronda · ${ETIQUETA_PARTIDA[licitacion.partida]}`}
          >
            <GraficaLineas
              datos={grafica.datos}
              claveX="ronda"
              series={grafica.series}
              formatoValor={formatMonedaMillones}
              lineaReferencia={{
                valor: licitacion.presupuestoBase,
                etiqueta: "Presupuesto base",
              }}
              etiqueta={`Propuestas de cada proveedor por ronda en ${licitacion.folio}`}
            />
          </SectionCard>
          <SectionCard titulo="Proveedores por ronda" sinPadding>
            <DataTable columns={columnas} data={filas} />
          </SectionCard>
          {rondasConPrecios(licitacion).length > 0 ? (
            <ComparativoPorConcepto licitacion={licitacion} proveedores={proveedores} />
          ) : null}
          {licitacion.invitaciones.length > 0 ? (
            <SectionCard titulo="Invitaciones enviadas">
              <ul className="divide-y divide-brand-line">
                {licitacion.invitaciones.map((inv, i) => (
                  <li
                    key={`${inv.proveedorId}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-brand-primary">
                        {nombreProveedor(proveedores, inv.proveedorId)}
                      </span>
                      <span className="block text-xs text-brand-text-muted">
                        {ETIQUETA_CANAL[inv.canal]} · {formatFecha(inv.enviadaEl)} ·{" "}
                        {inv.hora}
                      </span>
                    </span>
                    <StatusChip estatus="SIMULADO" />
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
        <SectionCard titulo="Decisión" className="min-w-0">
          <Timeline eventos={eventos} />
          {enCurso ? (
            <p className="mt-4 text-sm text-brand-text-muted">
              {abierta
                ? `Ronda ${abierta.numero} abierta: ciérrala para comparar y adjudicar. `
                : "Pendiente de adjudicar. "}
              {conCatalogo
                ? "Al adjudicar se crea el contrato de obra con los precios unitarios del ganador."
                : "Adjudicar no crea el contrato: se dará de alta al firmarse."}
            </p>
          ) : licitacion.contratoObraId ? null : (
            <p className="mt-4 text-sm text-brand-text-muted">
              El contrato se dará de alta al firmarse.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
