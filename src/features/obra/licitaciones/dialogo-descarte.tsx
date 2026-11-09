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

import { proveedoresActivos, type Licitacion, type ProveedorObra } from "@/domain";
import { nombreProveedor } from "./agregados";
import { validarDescarte } from "./esquemas";

interface DialogoDescarteProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  licitacion: Licitacion;
  proveedores: readonly ProveedorObra[];
  onDescartar: (proveedorId: string, motivo: string) => void;
}

function FormularioDescarte({
  licitacion,
  proveedores,
  onDescartar,
  onCerrar,
}: Omit<DialogoDescarteProps, "abierto" | "onCambioAbierto"> & { onCerrar: () => void }) {
  const activos = proveedoresActivos(licitacion);
  const [proveedorId, setProveedorId] = useState(activos[0] ?? "");
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);
  const error = validarDescarte(licitacion, proveedorId, motivo);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (error) return;
        onDescartar(proveedorId, motivo.trim());
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Descartar proveedor</DialogTitle>
        <DialogDescription>
          El proveedor sale de la competencia al cierre de la ronda{" "}
          {licitacion.rondas.length} y el motivo queda en el historial de{" "}
          {licitacion.folio}.
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Proveedor" htmlFor="descarte-proveedor">
        <select
          id="descarte-proveedor"
          className={CLASE_SELECT}
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
        >
          {activos.map((id) => (
            <option key={id} value={id}>
              {nombreProveedor(proveedores, id)}
            </option>
          ))}
        </select>
      </Campo>
      <Campo
        etiqueta="Motivo del descarte"
        htmlFor="descarte-motivo"
        error={intentado ? error : undefined}
      >
        <Textarea
          id="descarte-motivo"
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
          className="bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          Descartar proveedor
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo de la PMO para sacar a un proveedor de la competencia; el motivo es obligatorio. */
export function DialogoDescarte({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoDescarteProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioDescarte {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
