"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ETIQUETA_CANAL,
  OPCIONES_CANAL,
  SOLO_44,
} from "@/features/cobranza/controles-programacion";
import {
  pendientesDeInvitar,
  proveedoresDePartida,
  rondaAbierta,
  type CanalAviso,
  type Licitacion,
  type Proveedor,
} from "@/domain";
import { cn } from "@/lib/utils";
import { nombreProveedor } from "./agregados";
import { CONTACTO_DEL_CANAL, motivoSinContacto } from "./esquemas";

interface DialogoInvitacionesProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  licitacion: Licitacion;
  proveedores: readonly Proveedor[];
  onEnviar: (proveedorIds: string[], canal: CanalAviso) => void;
}

interface Destinatario {
  id: string;
  nombre: string;
  contacto?: string;
  /** Por qué no se le puede invitar por el canal elegido. */
  motivo?: string;
}

/**
 * Participantes que faltan por invitar, con su dato de contacto del canal. Solo se
 * invita a los de la partida en el padrón (`proveedoresDePartida`) con ese dato.
 */
function destinatarios(
  licitacion: Licitacion,
  proveedores: readonly Proveedor[],
  canal: CanalAviso,
): Destinatario[] {
  const dePartida = new Map(
    proveedoresDePartida([...proveedores], licitacion.partida).map((p) => [p.id, p]),
  );
  return pendientesDeInvitar(licitacion).map((id): Destinatario => {
    const proveedor = dePartida.get(id);
    const nombre = nombreProveedor(proveedores, id);
    if (!proveedor)
      return { id, nombre, motivo: "Inactivo o sin la partida en el padrón" };
    const motivo = motivoSinContacto(proveedor.contacto, canal);
    return motivo
      ? { id, nombre, motivo }
      : { id, nombre, contacto: proveedor.contacto[CONTACTO_DEL_CANAL[canal]] };
  });
}

function FormularioInvitaciones({
  licitacion,
  proveedores,
  onEnviar,
  onCerrar,
}: Omit<DialogoInvitacionesProps, "abierto" | "onCambioAbierto"> & {
  onCerrar: () => void;
}) {
  const [canal, setCanal] = useState<CanalAviso>("WHATSAPP");
  const [excluidos, setExcluidos] = useState<ReadonlySet<string>>(new Set());
  const lista = destinatarios(licitacion, proveedores, canal);
  const elegidos = lista
    .filter((d) => !d.motivo && !excluidos.has(d.id))
    .map((d) => d.id);
  const abierta = rondaAbierta(licitacion);
  const numero = abierta?.numero ?? licitacion.rondas.length + 1;
  const alternar = (id: string, marcado: boolean) =>
    setExcluidos((previos) => {
      const siguiente = new Set(previos);
      if (marcado) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (elegidos.length === 0) return;
        onEnviar(elegidos, canal);
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>
          {abierta
            ? `Reenviar invitaciones · ronda ${numero}`
            : `Invitar a la ronda ${numero}`}
        </DialogTitle>
        <DialogDescription>
          {abierta
            ? "La ronda ya está abierta: solo se invita a quienes aún no tienen su invitación."
            : `Se manda el catálogo a los proveedores que siguen en la competencia y se abre la ronda ${numero}.`}{" "}
          El envío es simulado: queda en la bitácora de la licitación.
        </DialogDescription>
      </DialogHeader>
      <SegmentedControl
        etiqueta="Canal de envío"
        opciones={OPCIONES_CANAL}
        valor={canal}
        onChange={setCanal}
        className={SOLO_44}
      />
      {lista.length === 0 ? (
        <p className="text-sm text-brand-text-muted">
          Todos los participantes de la ronda ya tienen su invitación.
        </p>
      ) : (
        <ul className="divide-y divide-brand-line rounded-xl border border-brand-line">
          {lista.map((d) => {
            const marcado = !d.motivo && !excluidos.has(d.id);
            return (
              <li key={d.id}>
                <label
                  className={cn(
                    "flex min-h-11 items-center gap-3 px-3 py-2",
                    d.motivo ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={marcado}
                    disabled={d.motivo !== undefined}
                    onChange={(e) => alternar(d.id, e.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-brand-primary">
                      {d.nombre}
                    </span>
                    <span className="block text-xs text-brand-text-muted">
                      {d.motivo ?? `${ETIQUETA_CANAL[canal]}: ${d.contacto}`}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          disabled={elegidos.length === 0}
          className="h-11 bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          Enviar por {ETIQUETA_CANAL[canal]} ({elegidos.length})
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Diálogo de la PMO para mandar el catálogo por WhatsApp o correo (envío simulado). */
export function DialogoInvitaciones({
  abierto,
  onCambioAbierto,
  ...props
}: DialogoInvitacionesProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <FormularioInvitaciones {...props} onCerrar={() => onCambioAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
