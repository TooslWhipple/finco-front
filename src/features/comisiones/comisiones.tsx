"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, HandCoins, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  SectionCard,
  StatusChip,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { nombreDeUsuario } from "@/config/usuarios";
import {
  DEMO_TODAY,
  estadoDeCuenta,
  nombreLocatario,
  totalesComisiones,
  type Comision,
  type EstadoCuentaComisiones,
} from "@/domain";
import {
  useComisiones,
  useContratosVivos,
  useEsquemaComisiones,
  useFuentesLocatario,
  useLocales,
  useSesion,
} from "@/hooks";
import {
  formatFecha,
  formatLista,
  formatMoneda,
  formatNumero,
  formatPuntos,
} from "@/lib/format";
import { useAppStore } from "@/store";
import { DialogoEsquema } from "./dialogo-esquema";
import { ETIQUETA_CONCEPTO_COMISION, LEYENDA_ESQUEMA_EJEMPLO } from "./esquemas";

interface FilaComision extends Comision {
  /** Folio del contrato o, sin folio, código del local y locatario. */
  contrato: string;
}

/**
 * Comisiones generadas al firmar contratos: KPIs, estado de cuenta por usuario y
 * detalle. Quien ve al equipo ve todas; Ventas, solo las suyas. Pagar y editar el
 * esquema es de Dirección y Superadmin.
 */
export function Comisiones() {
  const { rol } = useSesion();
  const comisiones = useComisiones();
  const esquema = useEsquemaComisiones();
  const contratos = useContratosVivos().datos;
  const locales = useLocales().datos;
  const fuentes = useFuentesLocatario();
  const marcarPagada = useAppStore((s) => s.marcarComisionPagada);
  const puedePagar = can(rol, "comisiones.pagar");
  const puedeEditar = can(rol, "comisiones.esquemaEditar");
  const [editando, setEditando] = useState(false);

  const filas = useMemo<FilaComision[]>(() => {
    const contratoPorId = new Map((contratos ?? []).map((c) => [c.id, c]));
    const localPorId = new Map((locales ?? []).map((l) => [l.id, l]));
    const textoContrato = (contratoId: string): string => {
      const contrato = contratoPorId.get(contratoId);
      if (!contrato) return contratoId;
      if (contrato.folio) return contrato.folio;
      const codigo = localPorId.get(contrato.localId)?.codigo ?? contrato.localId;
      return `${codigo} · ${nombreLocatario(contrato.locatarioId, fuentes)}`;
    };
    return comisiones
      .map((c) => ({ ...c, contrato: textoContrato(c.contratoId) }))
      .sort((a, b) => b.generadaEl.localeCompare(a.generadaEl) || a.id.localeCompare(b.id));
  }, [comisiones, contratos, locales, fuentes]);

  const totales = useMemo(() => totalesComisiones(comisiones), [comisiones]);
  const pagadas = comisiones.filter((c) => c.pagadaEl !== undefined).length;
  const cuentas = useMemo(
    () => estadoDeCuenta(comisiones).sort((a, b) => b.generado - a.generado),
    [comisiones],
  );

  const columnasCuenta = useMemo<ColumnDef<EstadoCuentaComisiones>[]>(
    () => [
      {
        id: "usuario",
        header: "Usuario",
        accessorFn: (f) => nombreDeUsuario(f.usuarioId),
      },
      {
        id: "generado",
        header: "Generado",
        accessorFn: (f) => f.generado,
        cell: ({ row }) => formatMoneda(row.original.generado),
      },
      {
        id: "pagado",
        header: "Pagado",
        accessorFn: (f) => f.pagado,
        cell: ({ row }) => formatMoneda(row.original.pagado),
      },
      {
        id: "pendiente",
        header: "Pendiente",
        accessorFn: (f) => f.pendiente,
        cell: ({ row }) => formatMoneda(row.original.pendiente),
      },
    ],
    [],
  );

  const columnas = useMemo<ColumnDef<FilaComision>[]>(
    () => [
      {
        id: "contrato",
        header: "Contrato",
        accessorFn: (f) => f.contrato,
        cell: ({ row }) => (
          <span className="block">
            <span className="block font-medium">{row.original.contrato}</span>
            <span className="block text-xs text-brand-text-muted">
              Generada {formatFecha(row.original.generadaEl)}
            </span>
          </span>
        ),
      },
      {
        id: "usuario",
        header: "Cobra",
        accessorFn: (f) => nombreDeUsuario(f.usuarioId),
      },
      {
        id: "concepto",
        header: "Concepto",
        accessorFn: (f) => ETIQUETA_CONCEPTO_COMISION[f.concepto],
      },
      {
        id: "base",
        header: "Base",
        accessorFn: (f) => f.base,
        cell: ({ row }) => formatMoneda(row.original.base),
      },
      {
        id: "porcentaje",
        header: "%",
        accessorFn: (f) => f.porcentaje,
        cell: ({ row }) => formatPuntos(row.original.porcentaje),
      },
      {
        id: "monto",
        header: "Monto",
        accessorFn: (f) => f.monto,
        cell: ({ row }) => (
          <span className="font-medium">{formatMoneda(row.original.monto)}</span>
        ),
      },
      {
        id: "estatus",
        header: "Estatus",
        accessorFn: (f) => f.pagadaEl ?? "",
        cell: ({ row }) =>
          row.original.pagadaEl ? (
            <StatusChip
              estatus="PAGADA"
              etiqueta={`Pagada ${formatFecha(row.original.pagadaEl)}`}
            />
          ) : (
            <StatusChip estatus="PENDIENTE" />
          ),
      },
      ...(puedePagar
        ? [
            {
              id: "acciones",
              header: "",
              enableSorting: false,
              cell: ({ row }) =>
                row.original.pagadaEl ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Marcar pagada la comisión de ${nombreDeUsuario(row.original.usuarioId)} del contrato ${row.original.contrato}`}
                    onClick={() => {
                      marcarPagada(row.original.id, DEMO_TODAY);
                      toast.success(
                        `Comisión de ${nombreDeUsuario(row.original.usuarioId)} marcada como pagada`,
                      );
                    }}
                  >
                    <CheckCircle2 aria-hidden />
                    Marcar pagada
                  </Button>
                ),
            } satisfies ColumnDef<FilaComision>,
          ]
        : []),
    ],
    [puedePagar, marcarPagada],
  );

  const mandos = formatLista(esquema.mandosMedios.map(nombreDeUsuario));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Comisiones"
        descripcion="Comisiones que se generan al firmar cada contrato y su estado de cuenta: generado, pagado y pendiente."
        acciones={
          puedeEditar ? (
            <Button
              onClick={() => setEditando(true)}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              <Pencil aria-hidden />
              Editar esquema
            </Button>
          ) : undefined
        }
      />
      <div className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
        <p className="font-medium text-brand-text">{LEYENDA_ESQUEMA_EJEMPLO}</p>
        <p>
          Asesor {formatPuntos(esquema.asesorPct)} · Bono sin excepción{" "}
          {formatPuntos(esquema.bonoSinExcepcionPct)} · Mando medio{" "}
          {formatPuntos(esquema.mandoMedioPct)} ({mandos}), sobre la renta de los meses
          cobrados del primer año.
        </p>
      </div>

      <KpiRow>
        <KpiCard
          etiqueta="Generado"
          valor={formatMoneda(totales.generado)}
          subtexto={`${formatNumero(comisiones.length)} comisiones`}
        />
        <KpiCard
          etiqueta="Pagado"
          valor={formatMoneda(totales.pagado)}
          subtexto={`${formatNumero(pagadas)} pagadas`}
          tono="positivo"
        />
        <KpiCard
          etiqueta="Pendiente"
          valor={formatMoneda(totales.pendiente)}
          subtexto={`${formatNumero(comisiones.length - pagadas)} por pagar`}
          tono={totales.pendiente > 0 ? "alerta" : "neutro"}
        />
      </KpiRow>

      <SectionCard titulo="Estado de cuenta" sinPadding>
        <DataTable
          columns={columnasCuenta}
          data={cuentas}
          vacio={
            <EmptyState
              icono={HandCoins}
              titulo="Sin comisiones"
              descripcion="Las comisiones aparecen al firmarse un contrato."
            />
          }
        />
      </SectionCard>

      <SectionCard titulo="Detalle de comisiones" sinPadding>
        <DataTable
          columns={columnas}
          data={filas}
          tamanoPagina={15}
          ocultarEnVertical={["base", "porcentaje"]}
          vacio={
            <EmptyState
              icono={HandCoins}
              titulo="Sin comisiones"
              descripcion="Las comisiones aparecen al firmarse un contrato."
            />
          }
        />
      </SectionCard>

      {puedeEditar ? (
        <DialogoEsquema abierto={editando} onCambioAbierto={setEditando} />
      ) : null}
    </div>
  );
}
