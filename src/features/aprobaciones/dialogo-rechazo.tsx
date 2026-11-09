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

interface DialogoRechazoProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** A quién le llega el comentario ("Ventas", "la PMO"…). */
  destinatario: string;
  onConfirmar: (comentario: string) => void;
}

/** Rechazo de una excepción: el comentario es obligatorio. */
export function DialogoRechazo({
  abierto,
  onCambioAbierto,
  destinatario,
  onConfirmar,
}: DialogoRechazoProps) {
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string>();

  function alCambiar(siguiente: boolean) {
    if (!siguiente) {
      setComentario("");
      setError(undefined);
    }
    onCambioAbierto(siguiente);
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const texto = comentario.trim();
    if (texto.length === 0) {
      setError("Escribe el motivo del rechazo");
      return;
    }
    onConfirmar(texto);
    alCambiar(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent>
        <form onSubmit={enviar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Rechazar excepción</DialogTitle>
            <DialogDescription>
              El comentario queda en la línea de tiempo de la excepción y lo ve{" "}
              {destinatario}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="comentario-rechazo" className="text-sm font-medium">
              Motivo del rechazo (obligatorio)
            </label>
            <Textarea
              id="comentario-rechazo"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Indica por qué no procede"
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
            <Button type="submit" variant="destructive">
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
