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
import { Campo } from "@/features/cotizacion/campo";
import { DEMO_TODAY, validarApertura, type Contrato, type Local } from "@/domain";

interface DialogoRegistrarAperturaProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  local: Local;
  contrato: Contrato;
  onRegistrar: (fecha: string) => void;
}

function FormularioApertura({
  local,
  contrato,
  onRegistrar,
  onCerrar,
}: Omit<DialogoRegistrarAperturaProps, "abierto" | "onCambioAbierto"> & {
  onCerrar: () => void;
}) {
  const [fecha, setFecha] = useState<string>(DEMO_TODAY);
  const validacion = useMemo(
    () => validarApertura(contrato, fecha, DEMO_TODAY),
    [contrato, fecha],
  );
  const errorFecha = validacion.ok ? undefined : validacion.error;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!validacion.ok) return;
        onRegistrar(fecha);
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Registrar apertura del local {local.codigo}</DialogTitle>
        <DialogDescription>
          Indica el día en que el locatario abrió el local del contrato{" "}
          {contrato.folio ?? contrato.id}. El local sigue contando como rentado; deja de
          aparecer como sin abrir.
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Fecha de apertura" htmlFor="apertura-fecha" error={errorFecha}>
        <Input
          id="apertura-fecha"
          type="date"
          className="h-11"
          min={contrato.inicio}
          max={DEMO_TODAY}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          aria-invalid={errorFecha ? true : undefined}
        />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          disabled={!validacion.ok}
          className="min-h-11 bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Registrar apertura
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo para registrar la apertura de un local: pide la fecha y la valida contra el contrato. */
export function DialogoRegistrarApertura({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoRegistrarAperturaProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioApertura {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
