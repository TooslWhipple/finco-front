"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { CLASE_SELECT, Campo } from "@/features/cotizacion/campo";

import {
  DEMO_TODAY,
  tieneCatalogo,
  type FechasContrato,
  type Licitacion,
  type Proveedor,
} from "@/domain";
import { formatMoneda } from "@/lib/format";
import { candidatoMasBajo, candidatosAGanar } from "./agregados";
import { fechasPropuestas, validarAdjudicacion, validarFechasContrato } from "./esquemas";

interface DialogoAdjudicarProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  licitacion: Licitacion;
  proveedores: readonly Proveedor[];
  /** Con catálogo llegan las fechas del contrato que nace al adjudicar. */
  onAdjudicar: (ganadorId: string, motivo: string, fechas?: FechasContrato) => void;
}

function FormularioAdjudicar({
  licitacion,
  proveedores,
  onAdjudicar,
  onCerrar,
}: Omit<DialogoAdjudicarProps, "abierto" | "onCambioAbierto"> & {
  onCerrar: () => void;
}) {
  const candidatos = candidatosAGanar(licitacion, proveedores);
  const [ganadorId, setGanadorId] = useState(candidatoMasBajo(candidatos));
  const [motivo, setMotivo] = useState("");
  const [fechas, setFechas] = useState<FechasContrato>(() =>
    fechasPropuestas(DEMO_TODAY),
  );
  const [intentado, setIntentado] = useState(false);
  const conCatalogo = tieneCatalogo(licitacion);
  const error = validarAdjudicacion(licitacion, ganadorId, motivo);
  const errorFechas = conCatalogo ? validarFechasContrato(fechas, DEMO_TODAY) : undefined;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (error || errorFechas) return;
        onAdjudicar(ganadorId, motivo.trim(), conCatalogo ? fechas : undefined);
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Adjudicar {licitacion.folio}</DialogTitle>
        <DialogDescription>
          {conCatalogo
            ? "Se adjudica por el monto de la última ronda cerrada y se crea el contrato de obra con los precios unitarios del ganador."
            : "Se adjudica por el monto de la última ronda. El contrato se dará de alta al firmarse."}
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Ganador" htmlFor="adjudicar-ganador">
        <select
          id="adjudicar-ganador"
          className={CLASE_SELECT}
          value={ganadorId}
          onChange={(e) => setGanadorId(e.target.value)}
        >
          {candidatos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · {formatMoneda(c.monto)}
            </option>
          ))}
        </select>
      </Campo>
      <Campo
        etiqueta="Motivo de la selección"
        htmlFor="adjudicar-motivo"
        error={intentado ? error : undefined}
      >
        <Textarea
          id="adjudicar-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          aria-invalid={intentado && error ? true : undefined}
        />
      </Campo>
      {conCatalogo ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-brand-text">
            Fechas del contrato
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Inicio" htmlFor="adjudicar-inicio">
              <Input
                id="adjudicar-inicio"
                type="date"
                value={fechas.inicioPlan}
                onChange={(e) => setFechas((f) => ({ ...f, inicioPlan: e.target.value }))}
                aria-invalid={intentado && errorFechas ? true : undefined}
                className="h-11 text-base md:text-base"
              />
            </Campo>
            <Campo etiqueta="Fin" htmlFor="adjudicar-fin">
              <Input
                id="adjudicar-fin"
                type="date"
                value={fechas.finPlan}
                onChange={(e) => setFechas((f) => ({ ...f, finPlan: e.target.value }))}
                aria-invalid={intentado && errorFechas ? true : undefined}
                className="h-11 text-base md:text-base"
              />
            </Campo>
          </div>
          {intentado && errorFechas ? (
            <p role="alert" className="text-xs text-brand-danger">
              {errorFechas}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Adjudicar
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo de la PMO para adjudicar la licitación; el ganador debe haber respondido la última ronda. */
export function DialogoAdjudicar({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoAdjudicarProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioAdjudicar {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
