"use client";

import { useState, type FormEvent } from "react";
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
import { formatMoneda } from "@/lib/format";
import { esquemaMotivoExcepcion } from "./esquemas";

interface DialogoExcepcionProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  rentaSolicitada: number;
  precioMinimo: number;
  onConfirmar: (motivo: string) => void;
}

export function DialogoExcepcion({
  abierto,
  onCambioAbierto,
  rentaSolicitada,
  precioMinimo,
  onConfirmar,
}: DialogoExcepcionProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string>();

  function alCambiar(siguiente: boolean) {
    if (!siguiente) {
      setMotivo("");
      setError(undefined);
    }
    onCambioAbierto(siguiente);
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const resultado = esquemaMotivoExcepcion.safeParse({ motivo });
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message);
      return;
    }
    onConfirmar(resultado.data.motivo);
    alCambiar(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent>
        <form onSubmit={enviar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Solicitar excepción de precio</DialogTitle>
            <DialogDescription>
              Renta propuesta {formatMoneda(rentaSolicitada)} contra un mínimo autorizado
              de {formatMoneda(precioMinimo)}. Superadmin decidirá en Precios y reglas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="motivo-excepcion" className="text-sm font-medium">
              Motivo
            </label>
            <Textarea
              id="motivo-excepcion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué conviene cerrar por debajo del mínimo"
              aria-invalid={error ? true : undefined}
            />
            {error ? (
              <p role="alert" className="text-xs text-brand-danger">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => alCambiar(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              Enviar solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
