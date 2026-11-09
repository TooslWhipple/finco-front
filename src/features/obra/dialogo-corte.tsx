"use client";

import { useState } from "react";
import { BarraProgreso, MoneyAmount } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FOTOS_POR_CORTE } from "@/data/fotos";
import { Campo, CLASE_SELECT } from "@/features/cotizacion/campo";
import {
  corteSinErrores,
  ETIQUETA_PARTIDA,
  ETIQUETA_UNIDAD,
  type ContratoObra,
  type CorteSemanal,
  type EntradaCorte,
  type FechaISO,
} from "@/domain";
import { formatFecha, formatNumero, formatPorcentaje } from "@/lib/format";
import { resumenCaptura, semanasCapturables } from "./agregados";
import { entradaDeCaptura, validarCaptura, type VolumenesTexto } from "./esquemas";

interface DialogoCorteProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** Contratos con alguna semana por capturar. */
  contratos: readonly ContratoObra[];
  cortes: readonly CorteSemanal[];
  hoy: FechaISO;
  onFirmar: (entrada: EntradaCorte) => void;
}

function FormularioCorte({
  contratos,
  cortes,
  hoy,
  onCerrar,
  onFirmar,
}: Omit<DialogoCorteProps, "abierto" | "onCambioAbierto"> & { onCerrar: () => void }) {
  const [contratoElegido, setContratoElegido] = useState(contratos[0]?.id ?? "");
  const [semanaElegida, setSemanaElegida] = useState("");
  const [textos, setTextos] = useState<VolumenesTexto>({});
  const [intentado, setIntentado] = useState(false);

  const contrato = contratos.find((c) => c.id === contratoElegido) ?? contratos[0];
  const semanas = contrato ? semanasCapturables(contrato, cortes, hoy) : [];
  // Por omisión, la semana libre más reciente; cambiar de contrato la reacomoda.
  const semana = semanas.includes(semanaElegida) ? semanaElegida : (semanas.at(-1) ?? "");

  if (!contrato || semana === "") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Registrar corte</DialogTitle>
          <DialogDescription>
            Todos los contratos están al día: no hay semanas por capturar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </DialogFooter>
      </>
    );
  }

  const errores = validarCaptura(contrato, cortes, semana, textos);
  const resumen = resumenCaptura(contrato, cortes, textos);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (!corteSinErrores(errores)) return;
        onFirmar(entradaDeCaptura(contrato, semana, textos));
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Registrar corte semanal</DialogTitle>
        <DialogDescription>
          Captura el volumen ejecutado en la semana, no el acumulado. Al firmar se
          adjuntan {FOTOS_POR_CORTE} fotos de evidencia y el corte queda en espera de la
          PMO.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Contrato" htmlFor="corte-contrato">
          <select
            id="corte-contrato"
            className={CLASE_SELECT}
            value={contrato.id}
            onChange={(e) => {
              setContratoElegido(e.target.value);
              setTextos({});
              setIntentado(false);
            }}
          >
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.folio} · {ETIQUETA_PARTIDA[c.partida]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Semana (lunes)"
          htmlFor="corte-semana"
          error={intentado ? errores.semana : undefined}
        >
          <select
            id="corte-semana"
            className={CLASE_SELECT}
            value={semana}
            onChange={(e) => setSemanaElegida(e.target.value)}
          >
            {semanas.map((s) => (
              <option key={s} value={s}>
                Semana del {formatFecha(s)}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="max-h-[45vh] overflow-auto rounded-lg border border-brand-line">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Contratado</TableHead>
              <TableHead className="text-right">Acum. anterior</TableHead>
              <TableHead className="w-40">Volumen de esta semana</TableHead>
              <TableHead className="text-right">Nuevo acum.</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumen.filas.map((fila) => {
              const error = errores.volumenes[fila.concepto.id];
              const unidad = ETIQUETA_UNIDAD[fila.concepto.unidad];
              return (
                <TableRow key={fila.concepto.id}>
                  <TableCell className="whitespace-normal">
                    <span className="block font-medium">{fila.concepto.clave}</span>
                    <span className="block text-xs text-brand-text-muted">
                      {fila.concepto.descripcion}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumero(fila.concepto.volumenContratado)} {unidad}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumero(fila.anterior)}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      aria-label={`Volumen de la semana de ${fila.concepto.clave} (${unidad})`}
                      aria-invalid={error ? true : undefined}
                      value={textos[fila.concepto.id] ?? ""}
                      onChange={(e) =>
                        setTextos((t) => ({ ...t, [fila.concepto.id]: e.target.value }))
                      }
                    />
                    {error ? (
                      <p role="alert" className="mt-1 text-xs text-brand-danger">
                        {error}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumero(fila.nuevoAcumulado)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPorcentaje(fila.avance)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {intentado && errores.general ? (
        <p role="alert" className="text-xs text-brand-danger">
          {errores.general}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg bg-brand-cream px-4 py-3">
        <p className="text-sm">
          <span className="text-brand-text-muted">Importe de la semana </span>
          <MoneyAmount valor={resumen.importe} className="font-semibold" />
        </p>
        <div className="min-w-48 flex-1 space-y-1">
          <p className="text-xs text-brand-text-muted">
            Avance del contrato con este corte: {formatPorcentaje(resumen.avanceNuevo)}
          </p>
          <BarraProgreso
            valor={resumen.avanceNuevo}
            etiqueta={`Avance de ${contrato.folio} con este corte`}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          disabled={intentado && !corteSinErrores(errores)}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Firmar y enviar
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo del Supervisor para capturar y firmar el corte semanal de un contrato. */
export function DialogoCorte({ abierto, onCambioAbierto, ...props }: DialogoCorteProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="sm:max-w-3xl">
        <FormularioCorte {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
