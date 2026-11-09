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
import { Input } from "@/components/ui/input";
import { Campo } from "@/features/cotizacion/campo";
import {
  proveedoresActivos,
  type EntradaRonda,
  type Licitacion,
  type ProveedorObra,
} from "@/domain";
import { nombreProveedor } from "./agregados";
import {
  entradaDeRonda,
  validarRonda,
  type CapturaProveedor,
  type CapturaRonda,
} from "./esquemas";

interface DialogoRondaProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  licitacion: Licitacion;
  proveedores: readonly ProveedorObra[];
  onRegistrar: (entrada: EntradaRonda) => void;
}

const CAMPO_VACIO: CapturaProveedor = { texto: "", noRespondio: false };

function FormularioRonda({
  licitacion,
  proveedores,
  onRegistrar,
  onCerrar,
}: Omit<DialogoRondaProps, "abierto" | "onCambioAbierto"> & { onCerrar: () => void }) {
  const participantes = proveedoresActivos(licitacion);
  const [captura, setCaptura] = useState<CapturaRonda>({});
  const [intentado, setIntentado] = useState(false);
  const errores = validarRonda(licitacion, participantes, captura);
  const hayErrores =
    errores.general !== undefined || Object.keys(errores.montos).length > 0;
  const cambiar = (id: string, parche: Partial<CapturaProveedor>) =>
    setCaptura((previa) => ({
      ...previa,
      [id]: { ...(previa[id] ?? CAMPO_VACIO), ...parche },
    }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (hayErrores) return;
        onRegistrar(entradaDeRonda(participantes, captura));
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Registrar ronda {licitacion.rondas.length + 1}</DialogTitle>
        <DialogDescription>
          Captura la propuesta de cada proveedor que sigue en la competencia, o marca que
          no respondió.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {participantes.map((id) => {
          const campo = captura[id] ?? CAMPO_VACIO;
          const error = intentado ? errores.montos[id] : undefined;
          return (
            <Campo
              key={id}
              etiqueta={nombreProveedor(proveedores, id)}
              htmlFor={`ronda-monto-${id}`}
              error={error}
            >
              <div className="flex items-center gap-3">
                <Input
                  id={`ronda-monto-${id}`}
                  inputMode="decimal"
                  placeholder="Monto en pesos"
                  value={campo.texto}
                  disabled={campo.noRespondio}
                  onChange={(e) => cambiar(id, { texto: e.target.value })}
                  aria-invalid={error ? true : undefined}
                />
                <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={campo.noRespondio}
                    onChange={(e) => cambiar(id, { noRespondio: e.target.checked })}
                  />
                  No respondió
                </label>
              </div>
            </Campo>
          );
        })}
      </div>
      {intentado && errores.general ? (
        <p role="alert" className="text-xs text-brand-danger">
          {errores.general}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          className="bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          Registrar ronda
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo de la PMO para capturar la siguiente ronda de propuestas. */
export function DialogoRonda({ abierto, onCambioAbierto, ...props }: DialogoRondaProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioRonda {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
