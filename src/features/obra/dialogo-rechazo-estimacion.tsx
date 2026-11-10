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

interface DialogoRechazoEstimacionProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** Texto que identifica la estimación (contrato y número). */
  descripcion: string;
  onRechazar: (comentario: string) => void;
}

function FormularioRechazo({
  descripcion,
  onCerrar,
  onRechazar,
}: Pick<DialogoRechazoEstimacionProps, "descripcion" | "onRechazar"> & {
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
        <DialogTitle>Rechazar estimación</DialogTitle>
        <DialogDescription>
          {descripcion}. El Supervisor verá el motivo y el volumen quedará libre para
          estimarse de nuevo.
        </DialogDescription>
      </DialogHeader>
      <Campo
        etiqueta="Motivo del rechazo"
        htmlFor="motivo-rechazo-estimacion"
        error={intentado ? error : undefined}
      >
        <Textarea
          id="motivo-rechazo-estimacion"
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
          Rechazar estimación
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo de la PMO para rechazar una estimación; el motivo es obligatorio. */
export function DialogoRechazoEstimacion({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoRechazoEstimacionProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioRechazo {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
