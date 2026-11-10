"use client";

import { useMemo, useState } from "react";
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
import { Campo } from "@/features/cotizacion/campo";
import { DEMO_TODAY, liberarLocal, type Contrato, type Local } from "@/domain";
import { formatMoneda } from "@/lib/format";

interface DialogoLiberarLocalProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  local: Local;
  contrato: Contrato;
  onLiberar: (fecha: string, motivo: string) => void;
}

function FormularioLiberar({
  local,
  contrato,
  onLiberar,
  onCerrar,
}: Omit<DialogoLiberarLocalProps, "abierto" | "onCambioAbierto"> & {
  onCerrar: () => void;
}) {
  const [fecha, setFecha] = useState<string>(DEMO_TODAY);
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);

  // La vista previa no depende del motivo: se calcula con uno de relleno.
  const previa = useMemo(
    () => liberarLocal(local, contrato, fecha, "vista previa"),
    [local, contrato, fecha],
  );
  const calculo = useMemo(
    () => liberarLocal(local, contrato, fecha, motivo),
    [local, contrato, fecha, motivo],
  );
  const errorMotivo =
    intentado && !calculo.ok && motivo.trim() === "" ? calculo.error : undefined;
  const errorFecha = !previa.ok ? previa.error : undefined;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (!calculo.ok) return;
        onLiberar(fecha, motivo.trim());
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Liberar local {local.codigo}</DialogTitle>
        <DialogDescription>
          Se termina el contrato {contrato.folio ?? contrato.id} y el local queda
          disponible con el precio actualizado por la regla de los años transcurridos.
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Fecha de terminación" htmlFor="liberar-fecha" error={errorFecha}>
        <Input
          id="liberar-fecha"
          type="date"
          className="h-11"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          aria-invalid={errorFecha ? true : undefined}
        />
      </Campo>
      <Campo etiqueta="Motivo" htmlFor="liberar-motivo" error={errorMotivo}>
        <Textarea
          id="liberar-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          aria-invalid={errorMotivo ? true : undefined}
        />
      </Campo>
      {previa.ok ? (
        <div
          data-testid="vista-previa-liberacion"
          className="rounded-lg bg-brand-secondary/15 px-4 py-3 text-sm"
        >
          {previa.liberacion.registros.length > 0 ? (
            <p>
              Precio de lista{" "}
              <strong>{formatMoneda(previa.liberacion.precioAnterior)}</strong> →{" "}
              <strong>{formatMoneda(previa.liberacion.precioNuevo)}</strong> · Mínimo{" "}
              <strong>{formatMoneda(previa.liberacion.minimoAnterior)}</strong> →{" "}
              <strong>{formatMoneda(previa.liberacion.minimoNuevo)}</strong> (regla{" "}
              {previa.liberacion.textoRegla}, {previa.liberacion.años.length}{" "}
              {previa.liberacion.años.length === 1 ? "año" : "años"})
            </p>
          ) : (
            <p>
              No hay años por actualizar: el precio de lista (
              {formatMoneda(previa.liberacion.precioAnterior)}) y el mínimo (
              {formatMoneda(previa.liberacion.minimoAnterior)}) se conservan.
            </p>
          )}
        </div>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          disabled={!previa.ok}
          className="min-h-11 bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Liberar local
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo para liberar un local: pide fecha y motivo y muestra el repricing antes de confirmar. */
export function DialogoLiberarLocal({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoLiberarLocalProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioLiberar {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
