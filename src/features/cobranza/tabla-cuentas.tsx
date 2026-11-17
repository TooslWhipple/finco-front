"use client";

import { Fragment, useMemo, useState } from "react";
import { Banknote, CornerDownRight, Eye, FileSearch, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { DEMO_TODAY, diasAtraso, estatusCobro, type Factura } from "@/domain";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDiaMes, formatMoneda, formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { agruparRecargos } from "./calculos";
import { ChipAtraso, ChipCobro } from "./chip-atraso";

export const FILAS_POR_PAGINA = 9;

/**
 * Anchos (px) de las columnas con `table-fixed`. Ancho disponible a 1440 px:
 * 1440 − sidebar 256 − main px-8 (64) = 1120; menos gap-6 (24) → 1096; 2fr/3 = 730;
 * menos p-5 de la card (40) = 690. Suma fija 594 → Locatario absorbe ~96.
 * La columna Locatario no lleva ancho: ocupa el resto y trunca. Acciones lleva
 * "Recordar" y el botón de pago.
 */
const ANCHOS_COLUMNAS = [null, 84, 58, 74, 58, 108, 80, 132] as const;

const ENCABEZADOS = [
  "Locatario",
  "Aniversario",
  "Folio CFDI",
  "Monto",
  "Vence",
  "Estatus",
  "Último seguimiento",
] as const;

interface TablaCuentasProps {
  /** Lista plana ya filtrada: rentas y, tras ellas o no, sus recargos. */
  facturas: Factura[];
  /** Código del local por id. */
  codigoLocal: ReadonlyMap<string, string>;
  /** Nombre de la plaza por id de local. */
  nombrePlaza: ReadonlyMap<string, string>;
  /** Nombre del locatario por id (incluye prospectos y cotizaciones de contratos de la demo). */
  nombrePorLocatario: ReadonlyMap<string, string>;
  /** Día de aniversario (facturación) por id de local. */
  diaAniversario: ReadonlyMap<string, number>;
  puedeGestionar: boolean;
  onRecordar: (factura: Factura) => void;
  /** Pago total de la renta, con sus recargos. */
  onRegistrarPago: (renta: Factura) => void;
}

/** Páginas visibles: la primera, las cercanas a la actual y la última, con "…" entre huecos. */
function paginasVisibles(actual: number, total: number): (number | "…")[] {
  const claves = new Set([1, 2, 3, total, actual - 1, actual, actual + 1]);
  const orden = [...claves].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const salida: (number | "…")[] = [];
  orden.forEach((p, i) => {
    if (i > 0 && p - orden[i - 1] > 1) salida.push("…");
    salida.push(p);
  });
  return salida;
}

export function TablaCuentas({
  facturas,
  codigoLocal,
  nombrePlaza,
  nombrePorLocatario,
  diaAniversario,
  puedeGestionar,
  onRecordar,
  onRegistrarPago,
}: TablaCuentasProps) {
  const [pagina, setPagina] = useState(1);
  // Se filtra, cuenta y pagina por renta; los recargos van anidados bajo la suya.
  const cuentas = useMemo(() => agruparRecargos(facturas), [facturas]);
  const totalPaginas = Math.max(1, Math.ceil(cuentas.length / FILAS_POR_PAGINA));
  const actual = Math.min(pagina, totalPaginas);
  const filas = cuentas.slice((actual - 1) * FILAS_POR_PAGINA, actual * FILAS_POR_PAGINA);

  if (cuentas.length === 0) {
    return (
      <EmptyState
        icono={FileSearch}
        titulo="Sin cuentas con este filtro"
        descripcion="Prueba con otro estatus o plaza."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Table className="table-fixed text-[13px] [&_td]:px-1.5 [&_th]:px-1.5">
        <colgroup>
          {ANCHOS_COLUMNAS.map((ancho, i) => (
            <col key={i} style={ancho === null ? undefined : { width: ancho }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow>
            {ENCABEZADOS.map((h) => (
              <TableHead
                key={h}
                className="text-[11px] font-medium tracking-tight whitespace-nowrap text-brand-text-muted uppercase"
              >
                {h}
              </TableHead>
            ))}
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ renta: f, recargos }) => {
            const estatus = estatusCobro(f, DEMO_TODAY);
            const dia =
              diaAniversario.get(f.localId) ?? Number(f.vencimiento.slice(8, 10));
            const complemento = f.complementos?.at(-1);
            return (
              <Fragment key={f.id}>
                <TableRow className="h-16">
                  <TableCell className="overflow-hidden">
                    <p className="line-clamp-2 font-medium whitespace-normal text-brand-text">
                      {nombrePorLocatario.get(f.locatarioId) ?? "Locatario"}
                    </p>
                    <p className="truncate text-xs text-brand-text-muted">
                      {nombrePlaza.get(f.localId)} ·{" "}
                      {codigoLocal.get(f.localId) ?? f.localId}
                    </p>
                  </TableCell>
                  <TableCell className="text-brand-text-muted">
                    Día {String(dia).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="overflow-hidden text-brand-text-muted">
                    <p className="truncate">{f.folio ?? f.id}</p>
                    {complemento ? (
                      <p
                        className="truncate text-xs text-brand-primary"
                        title={`Complemento de pago ${complemento.folio} · ${formatMoneda(complemento.monto)} · ${formatDiaMes(complemento.fecha)}`}
                      >
                        {complemento.folio}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {formatMoneda(f.monto)}
                  </TableCell>
                  <TableCell className="text-brand-text-muted">
                    {formatDiaMes(f.vencimiento)}
                  </TableCell>
                  <TableCell>
                    {estatus === "VENCIDA" ? (
                      <ChipAtraso dias={diasAtraso(f, DEMO_TODAY)} />
                    ) : (
                      <ChipCobro pagada={estatus === "PAGADA"} />
                    )}
                  </TableCell>
                  <TableCell
                    className="overflow-hidden text-xs text-brand-text-muted"
                    title={f.historial?.join("\n")}
                  >
                    <span className="line-clamp-2 whitespace-normal">
                      {f.seguimiento ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {estatus !== "PAGADA" && puedeGestionar ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2"
                          onClick={() => onRecordar(f)}
                        >
                          <MessageCircle aria-hidden />
                          Recordar
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Registrar pago de ${f.folio ?? f.id}`}
                          title="Registrar pago"
                          onClick={() => onRegistrarPago(f)}
                        >
                          <Banknote aria-hidden />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2"
                        onClick={() =>
                          toast(
                            `CFDI ${f.folio ?? f.id} · vista previa no disponible en el prototipo`,
                          )
                        }
                      >
                        <Eye aria-hidden />
                        Ver CFDI
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {recargos.map((r) => (
                  <FilaRecargo key={r.id} recargo={r} />
                ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-brand-line pt-3 text-sm text-brand-text-muted">
        <span>
          Mostrando {formatNumero(filas.length)} de {formatNumero(cuentas.length)} · Los
          avisos salen solos: 3 días antes, el día de pago y a los 5, 15 y 30 días de
          atraso
        </span>
        <nav aria-label="Paginación" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={actual === 1}
            onClick={() => setPagina(actual - 1)}
            className="px-1.5 disabled:opacity-40"
          >
            ‹
          </button>
          {paginasVisibles(actual, totalPaginas).map((p, i) =>
            p === "…" ? (
              <span key={`hueco-${i}`}>…</span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === actual ? "page" : undefined}
                onClick={() => setPagina(p)}
                className={cn(
                  "min-w-6 rounded px-1.5 tabular-nums",
                  p === actual
                    ? "font-semibold text-brand-primary"
                    : "hover:text-brand-primary",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={actual === totalPaginas}
            onClick={() => setPagina(actual + 1)}
            className="px-1.5 disabled:opacity-40"
          >
            ›
          </button>
        </nav>
      </div>
    </div>
  );
}

/** Recargo anidado bajo su renta: sin folio ni acciones; se liquida con la renta. */
function FilaRecargo({ recargo }: { recargo: Factura }) {
  return (
    <TableRow className="h-10 bg-brand-cream/40 hover:bg-brand-cream/60">
      <TableCell className="overflow-hidden">
        <p className="flex items-center gap-1 truncate pl-3 text-xs text-brand-text-muted">
          <CornerDownRight aria-hidden className="size-3.5 shrink-0" />
          Recargo moratorio
        </p>
      </TableCell>
      <TableCell />
      <TableCell className="text-brand-text-muted">—</TableCell>
      <TableCell className="text-xs font-medium tabular-nums">
        {formatMoneda(recargo.monto)}
      </TableCell>
      <TableCell className="text-xs text-brand-text-muted" title="Fecha del cargo">
        {formatDiaMes(recargo.vencimiento)}
      </TableCell>
      <TableCell>
        {recargo.pagadaEl ? (
          <ChipCobro pagada />
        ) : (
          <span className="text-xs text-brand-text-muted">Con la renta</span>
        )}
      </TableCell>
      <TableCell />
      <TableCell />
    </TableRow>
  );
}
