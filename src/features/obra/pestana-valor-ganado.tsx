"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ayuda,
  BarraProgreso,
  DataTable,
  EmptyState,
  GraficaLineas,
  KpiCard,
  KpiRow,
  MoneyAmount,
  SectionCard,
  StatusChip,
  type TonoBarra,
} from "@/components/shared";
import { ETIQUETA_PARTIDA, type SemaforoTerreno } from "@/domain";
import {
  formatFecha,
  formatIndice,
  formatMonedaMillones,
  formatNumero,
  formatPorcentaje,
} from "@/lib/format";
import { Activity } from "lucide-react";
import { tonoDeIndice, viewModelValorGanado, type FilaValorGanado } from "./agregados";
import type { ContextoExpediente } from "./contexto";
import { ListaAlertas } from "./lista-alertas";

const TONO_BARRA: Readonly<Record<SemaforoTerreno, TonoBarra>> = {
  VERDE: "verde",
  AMARILLO: "naranja",
  ROJO: "coral",
};

function ChipIndice({
  indice,
  semaforo,
}: {
  indice: number | null;
  semaforo: SemaforoTerreno | null;
}) {
  if (indice === null || semaforo === null) return <span>—</span>;
  return <StatusChip estatus={semaforo} etiqueta={formatIndice(indice)} />;
}

const COLUMNAS: ColumnDef<FilaValorGanado>[] = [
  {
    id: "contrato",
    header: "Contrato",
    accessorFn: (f) => f.contrato.folio,
    cell: ({ row }) => (
      <span className="block">
        <span className="block font-medium text-brand-primary">
          {row.original.contrato.folio}
        </span>
        <span className="block text-xs text-brand-text-muted">
          {ETIQUETA_PARTIDA[row.original.contrato.partida]}
        </span>
      </span>
    ),
  },
  {
    id: "avance",
    header: "Físico contra planeado",
    accessorFn: (f) => f.avanceFisico,
    cell: ({ row }) => (
      <span className="block min-w-36 space-y-1">
        <span className="block text-xs tabular-nums">
          {formatPorcentaje(row.original.avanceFisico)} de{" "}
          {formatPorcentaje(row.original.avancePlaneado)}
        </span>
        <BarraProgreso
          valor={row.original.avanceFisico}
          marcador={row.original.avancePlaneado}
          tono={
            row.original.semaforoSpi ? TONO_BARRA[row.original.semaforoSpi] : "primario"
          }
          etiqueta={`Avance físico de ${row.original.contrato.folio} contra lo planeado`}
        />
      </span>
    ),
  },
  {
    id: "spi",
    header: "SPI",
    accessorFn: (f) => f.spi ?? -1,
    cell: ({ row }) => (
      <ChipIndice indice={row.original.spi} semaforo={row.original.semaforoSpi} />
    ),
  },
  {
    id: "cpi",
    header: "CPI",
    accessorFn: (f) => f.cpi ?? -1,
    cell: ({ row }) => (
      <ChipIndice indice={row.original.cpi} semaforo={row.original.semaforoCpi} />
    ),
  },
  {
    id: "ganado",
    header: "Ganado",
    accessorFn: (f) => f.ev,
    cell: ({ row }) => <MoneyAmount valor={row.original.ev} />,
  },
  {
    id: "pagado",
    header: "Pagado",
    accessorFn: (f) => f.ac,
    cell: ({ row }) => <MoneyAmount valor={row.original.ac} />,
  },
];

function EtiquetaConAyuda({ nombre, texto }: { nombre: string; texto: string }) {
  return <Ayuda texto={texto}>{nombre}</Ayuda>;
}

/** Valor ganado del proyecto: alertas, indicadores en lenguaje llano, curva S y desempeño por contrato. */
export function PestanaValorGanado({
  contratos,
  cortes,
  pagos,
  hoy,
}: ContextoExpediente) {
  const vm = useMemo(
    () => viewModelValorGanado(contratos, cortes, pagos, hoy),
    [contratos, cortes, pagos, hoy],
  );
  if (!vm) {
    return (
      <EmptyState
        icono={Activity}
        titulo="Sin contratos de obra"
        descripcion="El valor ganado se calcula cuando el proyecto tiene contratos."
      />
    );
  }
  const { indicadores: i, alertas, curva, filas } = vm;
  const atraso = i.diasRetraso;

  return (
    <div className="space-y-6">
      <ListaAlertas alertas={alertas} />
      <KpiRow>
        <KpiCard
          etiqueta={
            <EtiquetaConAyuda
              nombre="SPI · ritmo"
              texto={
                i.spi === null
                  ? "Compara la obra hecha contra la que el plan pedía. Aún no hay obra planeada."
                  : `Por cada $1 de obra que debíamos llevar, llevamos $${formatIndice(i.spi)}.`
              }
            />
          }
          valor={i.spi === null ? "—" : formatIndice(i.spi)}
          detalle={
            i.desfaseTiempo === null
              ? undefined
              : `${formatPorcentaje(Math.max(0, i.desfaseTiempo))} de desfase en tiempo`
          }
          tono={tonoDeIndice(i.spi)}
        />
        <KpiCard
          etiqueta={
            <EtiquetaConAyuda
              nombre="CPI · costo"
              texto={
                i.cpi === null
                  ? "Compara la obra ganada contra lo pagado. Aún no hay pagos."
                  : `Por cada $1 que hemos pagado, hemos ganado $${formatIndice(i.cpi)} de obra.`
              }
            />
          }
          valor={i.cpi === null ? "—" : formatIndice(i.cpi)}
          detalle={
            i.eac === null
              ? undefined
              : `Costaría ${formatMonedaMillones(i.eac)} al terminar`
          }
          tono={tonoDeIndice(i.cpi)}
        />
        <KpiCard
          etiqueta={
            <EtiquetaConAyuda
              nombre="Ganado (EV)"
              texto="Valor de la obra terminada y validada por la PMO, a precio de contrato."
            />
          }
          valor={formatMonedaMillones(i.ev)}
          subtexto={`${formatPorcentaje(i.avanceFisico)} del presupuesto`}
        />
        <KpiCard
          etiqueta={
            <EtiquetaConAyuda
              nombre="Planeado (PV)"
              texto="Valor de la obra que el plan decía que ya debía estar hecha a hoy."
            />
          }
          valor={formatMonedaMillones(i.pv)}
          subtexto={`${formatPorcentaje(i.avancePlaneado)} del presupuesto`}
        />
        <KpiCard
          etiqueta={
            <EtiquetaConAyuda
              nombre="Costo real (AC)"
              texto="Lo pagado a los contratistas hasta hoy, importado de EnKontrol de forma simulada."
            />
          }
          valor={formatMonedaMillones(i.ac)}
          subtexto="importado de EnKontrol · simulado"
        />
        <KpiCard
          etiqueta={
            <EtiquetaConAyuda
              nombre="Término proyectado"
              texto="Cuándo terminaría la obra si el resto avanza al ritmo que llevamos."
            />
          }
          valor={i.fechaProyectada ? formatFecha(i.fechaProyectada) : "—"}
          delta={
            atraso === null || atraso === 0
              ? undefined
              : {
                  texto: `${formatNumero(Math.abs(atraso))} días ${atraso > 0 ? "de retraso" : "de adelanto"}`,
                  direccion: atraso > 0 ? "baja" : "sube",
                }
          }
          subtexto={`plan: ${formatFecha(i.finPlan)}`}
        />
      </KpiRow>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SectionCard titulo="Curva S: planeado, ganado y costo real">
          <GraficaLineas
            etiqueta="Curva S del proyecto con valor planeado, ganado y costo real por semana"
            datos={curva}
            claveX="fecha"
            series={[
              {
                clave: "pv",
                etiqueta: "Planeado (PV)",
                tono: "indigo",
                discontinua: true,
              },
              { clave: "ev", etiqueta: "Ganado (EV)", tono: "verde" },
              { clave: "ac", etiqueta: "Costo real (AC)", tono: "naranja" },
            ]}
            formatoValor={formatMonedaMillones}
            formatoX={formatFecha}
            lineaReferencia={{ valor: i.presupuesto, etiqueta: "Presupuesto" }}
            marcadorX={{ valor: hoy, etiqueta: "Hoy" }}
          />
        </SectionCard>
        <SectionCard titulo="Cómo leer esto">
          <ul className="space-y-3 text-sm text-brand-text">
            <li>
              <strong>Línea punteada:</strong> la obra que el plan pedía tener a cada
              semana.
            </li>
            <li>
              <strong>Línea verde:</strong> la obra que de verdad se terminó y validó la
              PMO. Si va debajo de la punteada, vamos atrasados.
            </li>
            <li>
              <strong>Línea naranja:</strong> lo que hemos pagado. Si va arriba de la
              verde, estamos gastando más de lo que avanzamos.
            </li>
          </ul>
        </SectionCard>
      </div>
      <SectionCard titulo="Desempeño por contrato">
        <DataTable columns={COLUMNAS} data={filas} />
      </SectionCard>
    </div>
  );
}
