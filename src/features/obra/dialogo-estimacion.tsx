"use client";

import { useState } from "react";
import { MoneyAmount } from "@/components/shared";
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
  estimacionSinErrores,
  ETIQUETA_PARTIDA,
  ETIQUETA_UNIDAD,
  type ContratoObra,
  type CorteSemanal,
  type EntradaEstimacion,
  type EstimacionObra,
} from "@/domain";
import { formatNumero, formatPorcentaje } from "@/lib/format";
import { resumenCapturaEstimacion } from "./agregados-estimaciones";
import { entradaDeEstimacion, validarEstimacion, type VolumenesTexto } from "./esquemas";

interface DialogoEstimacionProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** Contratos con volumen validado por estimar. */
  contratos: readonly ContratoObra[];
  cortes: readonly CorteSemanal[];
  estimaciones: readonly EstimacionObra[];
  onFirmar: (entrada: EntradaEstimacion) => void;
}

function FormularioEstimacion({
  contratos,
  cortes,
  estimaciones,
  onCerrar,
  onFirmar,
}: Omit<DialogoEstimacionProps, "abierto" | "onCambioAbierto"> & {
  onCerrar: () => void;
}) {
  const [contratoElegido, setContratoElegido] = useState(contratos[0]?.id ?? "");
  const [textos, setTextos] = useState<VolumenesTexto>({});
  const [intentado, setIntentado] = useState(false);

  const contrato = contratos.find((c) => c.id === contratoElegido) ?? contratos[0];

  if (!contrato) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Registrar estimación</DialogTitle>
          <DialogDescription>
            No hay volumen validado en cortes por estimar: la PMO debe validar primero los
            cortes semanales.
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

  const entrada = entradaDeEstimacion(contrato, textos);
  const errores = validarEstimacion(contrato, cortes, estimaciones, textos);
  const resumen = resumenCapturaEstimacion(
    contrato,
    cortes,
    estimaciones,
    entrada.volumenes,
  );
  const { importes } = resumen;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (!estimacionSinErrores(errores)) return;
        onFirmar(entrada);
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Registrar estimación de pago</DialogTitle>
        <DialogDescription>
          Captura el volumen que el contratista quiere cobrar y que validaste en obra. No
          puede pasar de lo que la PMO ya validó en cortes. Al firmar se adjuntan{" "}
          {FOTOS_POR_CORTE} fotos de evidencia y la estimación queda en espera de la PMO.
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Contrato" htmlFor="estimacion-contrato">
        <select
          id="estimacion-contrato"
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
              {c.folio} · {ETIQUETA_PARTIDA[c.partida]} · {c.contratista}
            </option>
          ))}
        </select>
      </Campo>
      <div className="max-h-[40vh] overflow-auto rounded-lg border border-brand-line">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Precio unitario</TableHead>
              <TableHead className="text-right">Por estimar</TableHead>
              <TableHead className="w-40">Volumen a estimar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumen.filas.map(({ concepto, porEstimar }) => {
              const error = errores.volumenes[concepto.id];
              const unidad = ETIQUETA_UNIDAD[concepto.unidad];
              return (
                <TableRow key={concepto.id}>
                  <TableCell className="whitespace-normal">
                    <span className="block font-medium">{concepto.clave}</span>
                    <span className="block text-xs text-brand-text-muted">
                      {concepto.descripcion}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyAmount valor={concepto.precioUnitario} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumero(porEstimar)} {unidad}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      aria-label={`Volumen a estimar de ${concepto.clave} (${unidad})`}
                      aria-invalid={error ? true : undefined}
                      value={textos[concepto.id] ?? ""}
                      onChange={(e) =>
                        setTextos((t) => ({ ...t, [concepto.id]: e.target.value }))
                      }
                    />
                    {error ? (
                      <p role="alert" className="mt-1 text-xs text-brand-danger">
                        {error}
                      </p>
                    ) : null}
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
      <dl className="grid gap-x-8 gap-y-1 rounded-lg bg-brand-cream px-4 py-3 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-brand-text-muted">Importe bruto</dt>
          <dd>
            <MoneyAmount valor={importes.importeBruto} className="font-semibold" />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-brand-text-muted">
            Amortización del anticipo ({formatPorcentaje(contrato.anticipoPct)})
          </dt>
          <dd>
            <MoneyAmount valor={-importes.amortizacionAnticipo} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-brand-text-muted">
            Fondo de garantía ({formatPorcentaje(contrato.fondoGarantiaPct)})
          </dt>
          <dd>
            <MoneyAmount valor={-importes.fondoGarantia} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-medium">Neto a transferir</dt>
          <dd>
            <MoneyAmount valor={importes.importeNeto} className="font-semibold" />
          </dd>
        </div>
      </dl>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          disabled={intentado && !estimacionSinErrores(errores)}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Firmar y enviar
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo del Supervisor para registrar y firmar la estimación del contratista. */
export function DialogoEstimacion({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoEstimacionProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="sm:max-w-3xl">
        <FormularioEstimacion {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
