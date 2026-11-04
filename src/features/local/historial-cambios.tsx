"use client";

import { Timeline } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFecha } from "@/lib/format";
import type { EntradaHistorial } from "./calculos";

interface HistorialCambiosProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  codigoLocal: string;
  entradas: readonly EntradaHistorial[];
}

/** Historial de precios y ediciones del local; se abre desde la cabecera. */
export function HistorialCambios({
  abierto,
  onAbiertoChange,
  codigoLocal,
  entradas,
}: HistorialCambiosProps) {
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de cambios</DialogTitle>
          <DialogDescription>
            Precios registrados y ediciones del local {codigoLocal}, lo más reciente
            primero.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto pr-1">
          {entradas.length === 0 ? (
            <p className="text-sm text-brand-text-muted">Sin cambios registrados.</p>
          ) : (
            <Timeline
              eventos={entradas.map((e) => ({
                id: e.id,
                titulo: e.titulo,
                detalle: e.detalle,
                fecha: formatFecha(e.fecha),
                tono: e.tono,
              }))}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
