import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  GaleriaFotos,
  PanelDetalle,
  StatusChip,
  Timeline,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ETIQUETA_PARTIDA, ETIQUETA_UNIDAD, type CorteSemanal } from "@/domain";
import { formatFecha, formatNumero } from "@/lib/format";
import {
  ESTADO_CORTE,
  eventosDeCorte,
  volumenesDeCorte,
  type FilaCorte,
  type FilaVolumenCorte,
} from "./agregados";

const ANCHOS = [null, 92, 92] as const;

const COLUMNAS: ColumnDef<FilaVolumenCorte>[] = [
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
    id: "semana",
    header: "Esta semana",
    accessorFn: (f) => f.semana,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumero(row.original.semana)}{" "}
        {ETIQUETA_UNIDAD[row.original.concepto.unidad]}
      </span>
    ),
  },
  {
    id: "acumulado",
    header: "Acumulado",
    accessorFn: (f) => f.acumulado,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumero(row.original.acumulado)} /{" "}
        {formatNumero(row.original.concepto.volumenContratado)}
      </span>
    ),
  },
];

interface PanelCorteProps {
  fila: FilaCorte;
  /** Todos los cortes del proyecto, para el acumulado a esa semana. */
  cortes: readonly CorteSemanal[];
  puedeValidar: boolean;
  onValidar: () => void;
  onRechazar: () => void;
  onCerrar: () => void;
}

/** Detalle de un corte: volúmenes de la semana y acumulado, evidencia, trazabilidad y acciones de la PMO. */
export function PanelCorte({
  fila,
  cortes,
  puedeValidar,
  onValidar,
  onRechazar,
  onCerrar,
}: PanelCorteProps) {
  const { corte, contrato } = fila;
  const estado = ESTADO_CORTE[corte.estado];
  const porValidar = corte.estado === "FIRMADO_SUPERVISOR";
  return (
    <PanelDetalle
      titulo={`${contrato.folio} · semana del ${formatFecha(corte.semana)}`}
      subtitulo={`${ETIQUETA_PARTIDA[contrato.partida]} · ${contrato.contratista}`}
      estado={<StatusChip estatus={estado.estatus} etiqueta={estado.etiqueta} />}
      onCerrar={onCerrar}
      secciones={[
        {
          titulo: "Volúmenes",
          contenido: (
            <DataTable
              columns={COLUMNAS}
              data={volumenesDeCorte(corte, contrato, cortes)}
              anchos={ANCHOS}
            />
          ),
        },
        {
          titulo: "Evidencia",
          contenido: (
            <GaleriaFotos
              fotos={corte.evidencia}
              titulo={`Evidencia de ${contrato.folio}`}
              variante="portada"
            />
          ),
        },
        {
          titulo: "Trazabilidad",
          contenido: (
            <Timeline
              eventos={eventosDeCorte(corte).map((e) => ({
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
        puedeValidar && porValidar ? (
          <>
            <Button onClick={onValidar}>Validar</Button>
            <Button variant="outline" onClick={onRechazar}>
              Rechazar
            </Button>
          </>
        ) : null
      }
    />
  );
}
