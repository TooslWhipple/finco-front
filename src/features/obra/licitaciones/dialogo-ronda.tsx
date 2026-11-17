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
import { CLASE_SELECT, Campo } from "@/features/cotizacion/campo";
import {
  proveedoresActivos,
  rondaAbierta,
  type EntradaRonda,
  type Licitacion,
  type PrecioConcepto,
  type Proveedor,
} from "@/domain";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nombreProveedor } from "./agregados";
import { FormularioPrecios } from "./formulario-precios";
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
  proveedores: readonly Proveedor[];
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

interface DialogoRespuestaProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  licitacion: Licitacion;
  proveedores: readonly Proveedor[];
  onCapturar: (proveedorId: string, precios: PrecioConcepto[]) => void;
}

/** De dónde viene la respuesta vigente de un proveedor en la ronda abierta. */
function origenRespuesta(licitacion: Licitacion, proveedorId: string): string {
  const propuesta = rondaAbierta(licitacion)?.propuestas.find(
    (p) => p.proveedorId === proveedorId,
  );
  if (!propuesta?.respondio) return "Por responder.";
  const fecha = propuesta.respondidaEl
    ? ` el ${formatFecha(propuesta.respondidaEl)}`
    : "";
  return propuesta.capturadaPor === "CONTRATISTA"
    ? `Respondió en el portal${fecha}. Si capturas, sobrescribes su respuesta.`
    : `Capturado por PMO${fecha}.`;
}

/**
 * La PMO captura por precio unitario la respuesta de un proveedor de la ronda
 * abierta (la que mandó por correo o por teléfono); puede sobrescribir la del portal.
 */
export function DialogoRespuesta({
  abierto,
  onCambioAbierto,
  licitacion,
  proveedores,
  onCapturar,
}: DialogoRespuestaProps) {
  const abiertaRonda = rondaAbierta(licitacion);
  const participantes = abiertaRonda?.propuestas.map((p) => p.proveedorId) ?? [];
  const [proveedorId, setProveedorId] = useState(
    () =>
      abiertaRonda?.propuestas.find((p) => !p.respondio)?.proveedorId ??
      participantes[0] ??
      "",
  );
  const propuesta = abiertaRonda?.propuestas.find((p) => p.proveedorId === proveedorId);
  const cerrar = () => onCambioAbierto(false);
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Capturar respuesta · ronda {abiertaRonda?.numero ?? licitacion.rondas.length}
          </DialogTitle>
          <DialogDescription>
            Captura el precio unitario de cada concepto a nombre del proveedor; queda como
            capturado por PMO.
          </DialogDescription>
        </DialogHeader>
        <Campo
          etiqueta="Proveedor"
          htmlFor="respuesta-proveedor"
          ayuda={proveedorId ? origenRespuesta(licitacion, proveedorId) : undefined}
        >
          <select
            id="respuesta-proveedor"
            className={cn(CLASE_SELECT, "h-11 text-base md:text-base")}
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
          >
            {participantes.map((id) => (
              <option key={id} value={id}>
                {nombreProveedor(proveedores, id)}
              </option>
            ))}
          </select>
        </Campo>
        {proveedorId ? (
          <FormularioPrecios
            key={proveedorId}
            licitacion={licitacion}
            proveedorId={proveedorId}
            inicial={propuesta?.precios}
            etiquetaEnviar="Guardar respuesta"
            onEnviar={(precios) => {
              onCapturar(proveedorId, precios);
              cerrar();
            }}
            secundarias={
              <Button type="button" variant="outline" className="h-11" onClick={cerrar}>
                Volver
              </Button>
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
