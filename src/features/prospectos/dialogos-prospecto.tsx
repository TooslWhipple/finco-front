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
import {
  ETIQUETA_TIPO_CONTACTO,
  TIPOS_CONTACTO,
  type Prospecto,
  type TipoContactoProspecto,
} from "@/domain";
import { cn } from "@/lib/utils";

interface DialogoBase {
  prospecto: Prospecto;
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
}

const CLASE_BOTON = "min-h-11 bg-brand-cta text-white hover:bg-brand-cta-light";

// --- registrar contacto ---------------------------------------------------

function FormularioContacto({
  prospecto,
  onCerrar,
  onRegistrar,
}: {
  prospecto: Prospecto;
  onCerrar: () => void;
  onRegistrar: (contacto: { tipo: TipoContactoProspecto; nota: string }) => void;
}) {
  const [tipo, setTipo] = useState<TipoContactoProspecto>("LLAMADA");
  const [nota, setNota] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRegistrar({ tipo, nota });
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Registrar contacto</DialogTitle>
        <DialogDescription>
          {prospecto.nombre}. El contacto queda en la actividad con la fecha de hoy y
          reinicia los días sin contacto.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <p id="tipo-contacto-prospecto" className="text-sm font-medium text-brand-text">
          Tipo de contacto
        </p>
        <div
          role="radiogroup"
          aria-labelledby="tipo-contacto-prospecto"
          className="flex flex-wrap gap-2"
        >
          {TIPOS_CONTACTO.map((opcion) => (
            <button
              key={opcion}
              type="button"
              role="radio"
              aria-checked={tipo === opcion}
              onClick={() => setTipo(opcion)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                tipo === opcion
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-brand-line bg-card text-brand-text hover:border-brand-indigo",
              )}
            >
              {ETIQUETA_TIPO_CONTACTO[opcion]}
            </button>
          ))}
        </div>
      </div>
      <Campo etiqueta="Nota (opcional)" htmlFor="nota-contacto-prospecto">
        <Textarea
          id="nota-contacto-prospecto"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Qué se habló o en qué quedaron"
        />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCerrar}>
          Volver
        </Button>
        <Button type="submit" className={CLASE_BOTON}>
          Registrar contacto
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DialogoRegistrarContacto({
  prospecto,
  abierto,
  onCambioAbierto,
  onRegistrar,
}: DialogoBase & {
  onRegistrar: (contacto: { tipo: TipoContactoProspecto; nota: string }) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioContacto
          prospecto={prospecto}
          onCerrar={() => onCambioAbierto(false)}
          onRegistrar={onRegistrar}
        />
      </DialogContent>
    </Dialog>
  );
}

// --- marcar perdido -------------------------------------------------------

function FormularioPerdido({
  prospecto,
  onCerrar,
  onMarcar,
}: {
  prospecto: Prospecto;
  onCerrar: () => void;
  onMarcar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const vacio = motivo.trim() === "";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (vacio) return;
        onMarcar(motivo.trim());
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Marcar como perdido</DialogTitle>
        <DialogDescription>
          {prospecto.nombre} saldrá del embudo activo. El motivo queda en su actividad.
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Motivo" htmlFor="motivo-perdido-prospecto">
        <Textarea
          id="motivo-perdido-prospecto"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Por qué ya no vale la pena buscarlo"
        />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCerrar}>
          Volver
        </Button>
        <Button type="submit" disabled={vacio} className={CLASE_BOTON}>
          Marcar perdido
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DialogoMarcarPerdido({
  prospecto,
  abierto,
  onCambioAbierto,
  onMarcar,
}: DialogoBase & { onMarcar: (motivo: string) => void }) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioPerdido
          prospecto={prospecto}
          onCerrar={() => onCambioAbierto(false)}
          onMarcar={onMarcar}
        />
      </DialogContent>
    </Dialog>
  );
}
