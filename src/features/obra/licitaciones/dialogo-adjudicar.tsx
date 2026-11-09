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
import { Textarea } from "@/components/ui/textarea";
import { CLASE_SELECT, Campo } from "@/features/cotizacion/campo";

import { type Licitacion, type ProveedorObra } from "@/domain";
import { formatMoneda } from "@/lib/format";
import { candidatosAGanar } from "./agregados";
import { validarAdjudicacion } from "./esquemas";

interface DialogoAdjudicarProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  licitacion: Licitacion;
  proveedores: readonly ProveedorObra[];
  onAdjudicar: (ganadorId: string, motivo: string) => void;
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
  const [ganadorId, setGanadorId] = useState(candidatos[0]?.id ?? "");
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);
  const error = validarAdjudicacion(licitacion, ganadorId, motivo);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (error) return;
        onAdjudicar(ganadorId, motivo.trim());
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Adjudicar {licitacion.folio}</DialogTitle>
        <DialogDescription>
          Se adjudica por el monto de la última ronda. El contrato se dará de alta al
          firmarse.
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
