import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  GaleriaFotos,
  MoneyAmount,
  PanelDetalle,
  StatusChip,
  Timeline,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ETIQUETA_PARTIDA, ETIQUETA_UNIDAD } from "@/domain";
import { formatFecha, formatNumero, formatPorcentaje } from "@/lib/format";
import {
  ESTADO_ESTIMACION,
  eventosDeEstimacion,
  volumenesDeEstimacion,
  type FilaEstimacion,
  type FilaVolumenEstimacion,
} from "./agregados-estimaciones";

const ANCHOS = [null, 92, 110] as const;

const COLUMNAS: ColumnDef<FilaVolumenEstimacion>[] = [
  {
    id: "concepto",
    header: "Concepto",
    accessorFn: (f) => f.concepto.clave,
    cell: ({ row }) => (
      <span className="block">
        <span className="block font-medium">{row.original.concepto.clave}</span>
        <span className="block text-xs text-brand-text-muted">
          {row.original.concepto.descripcion}
        </span>
      </span>
    ),
  },
  {
    id: "volumen",
    header: "Volumen",
    accessorFn: (f) => f.volumen,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumero(row.original.volumen)}{" "}
        {ETIQUETA_UNIDAD[row.original.concepto.unidad]}
      </span>
    ),
  },
  {
    id: "importe",
    header: "Importe",
    accessorFn: (f) => f.importe,
    cell: ({ row }) => <MoneyAmount valor={row.original.importe} />,
  },
];

function Renglon({
  etiqueta,
  children,
  fuerte,
}: {
  etiqueta: string;
  children: React.ReactNode;
  fuerte?: boolean;
}) {
  return (
    <div
      className={
        fuerte
          ? "flex justify-between gap-3 border-t border-brand-line pt-1.5 font-semibold"
          : "flex justify-between gap-3"
      }
    >
      <dt className={fuerte ? undefined : "text-brand-text-muted"}>{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  );
}

interface PanelEstimacionProps {
  fila: FilaEstimacion;
  puedeAutorizar: boolean;
  onAutorizar: () => void;
  onRechazar: () => void;
  onCerrar: () => void;
}

/** Detalle de una estimación: desglose bruto → anticipo → fondo → neto, volúmenes, evidencia y acciones de la PMO. */
export function PanelEstimacion({
  fila,
  puedeAutorizar,
  onAutorizar,
  onRechazar,
  onCerrar,
}: PanelEstimacionProps) {
  const { estimacion, contrato } = fila;
  const estado = ESTADO_ESTIMACION[estimacion.estado];
  const porAutorizar = estimacion.estado === "VALIDADA_SUPERVISOR";
  return (
    <PanelDetalle
      titulo={`${contrato.folio} · estimación ${estimacion.numero}`}
      subtitulo={`${ETIQUETA_PARTIDA[contrato.partida]} · ${contrato.contratista} · del ${formatFecha(estimacion.periodo.desde)} al ${formatFecha(estimacion.periodo.hasta)}`}
      estado={<StatusChip estatus={estado.estatus} etiqueta={estado.etiqueta} />}
      onCerrar={onCerrar}
      secciones={[
        {
          titulo: "Desglose del pago",
          contenido: (
            <dl className="space-y-1.5">
              <Renglon etiqueta="Importe bruto (volumen × PU)">
                <MoneyAmount valor={estimacion.importeBruto} />
              </Renglon>
              <Renglon
                etiqueta={`Amortización del anticipo (${formatPorcentaje(contrato.anticipoPct)})`}
              >
                <MoneyAmount valor={-estimacion.amortizacionAnticipo} />
              </Renglon>
              <Renglon
                etiqueta={`Fondo de garantía (${formatPorcentaje(contrato.fondoGarantiaPct)})`}
              >
                <MoneyAmount valor={-estimacion.fondoGarantia} />
              </Renglon>
              <Renglon etiqueta="Neto a transferir" fuerte>
                <MoneyAmount valor={estimacion.importeNeto} />
              </Renglon>
            </dl>
          ),
        },
        {
          titulo: "Volúmenes estimados",
          contenido: (
            <DataTable
              columns={COLUMNAS}
              data={volumenesDeEstimacion(estimacion, contrato)}
              anchos={ANCHOS}
            />
          ),
        },
        {
          titulo: "Evidencia",
          contenido: (
            <GaleriaFotos
              fotos={estimacion.evidencia}
              titulo={`Evidencia de la estimación ${estimacion.numero} de ${contrato.folio}`}
              variante="portada"
            />
          ),
        },
        {
          titulo: "Trazabilidad",
          contenido: (
            <Timeline
              eventos={eventosDeEstimacion(estimacion).map((e) => ({
                id: e.id,
                titulo: e.titulo,
                detalle: e.detalle,
                fecha: formatFecha(e.fecha),
                tono: e.tono,
              }))}
            />
          ),
        },
      ]}
      acciones={
        puedeAutorizar && porAutorizar ? (
          <>
            <Button onClick={onAutorizar}>Autorizar pago</Button>
            <Button variant="outline" onClick={onRechazar}>
              Rechazar
            </Button>
          </>
        ) : null
      }
    />
  );
}
