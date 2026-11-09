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
import { Campo } from "@/features/cotizacion/campo";
import { errorComentarioRechazo } from "./esquemas";

interface DialogoRechazoCorteProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** Texto que identifica el corte (contrato y semana). */
  descripcionCorte: string;
  onRechazar: (comentario: string) => void;
}

function FormularioRechazo({
  descripcionCorte,
  onCerrar,
  onRechazar,
}: Pick<DialogoRechazoCorteProps, "descripcionCorte" | "onRechazar"> & {
  onCerrar: () => void;
}) {
  const [comentario, setComentario] = useState("");
  const [intentado, setIntentado] = useState(false);
  const error = errorComentarioRechazo(comentario);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (error) return;
        onRechazar(comentario.trim());
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Rechazar corte</DialogTitle>
        <DialogDescription>
          {descripcionCorte}. El Supervisor verá el motivo y podrá volver a capturar la
          semana.
        </DialogDescription>
      </DialogHeader>
      <Campo
        etiqueta="Motivo del rechazo"
        htmlFor="motivo-rechazo-corte"
        error={intentado ? error : undefined}
      >
        <Textarea
          id="motivo-rechazo-corte"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          aria-invalid={intentado && error ? true : undefined}
        />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          className="bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          Rechazar corte
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo de la PMO para rechazar un corte; el comentario es obligatorio. */
export function DialogoRechazoCorte({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoRechazoCorteProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioRechazo {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
