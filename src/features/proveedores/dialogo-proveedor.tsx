"use client";

import { useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { siguienteIdProveedor, type Proveedor } from "@/domain";
import { usePlazas, useProveedores } from "@/hooks";
import { useAppStore } from "@/store";
import { Campo } from "@/features/cotizacion/campo";
import {
  OPCIONES_CATEGORIA,
  OPCIONES_PARTIDA,
  PROVEEDOR_VACIO,
  esquemaProveedor,
  formularioDeProveedor,
  proveedorDesdeFormulario,
  type ProveedorFormulario,
  type ProveedorValidado,
} from "./esquemas";

interface DialogoProveedorProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** Proveedor a editar; sin él, el diálogo da de alta uno nuevo. */
  proveedor?: Proveedor;
  /** Se llama con el id del proveedor guardado. */
  onGuardado?: (id: string) => void;
}

/** Alta o edición de un proveedor del padrón (solo con `proveedores.gestionar`). */
export function DialogoProveedor({
  abierto,
  onCambioAbierto,
  proveedor,
  onGuardado,
}: DialogoProveedorProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <FormularioProveedor
          // Al cambiar de proveedor el formulario se reinicia con sus datos.
          key={proveedor?.id ?? "nuevo"}
          proveedor={proveedor}
          onCancelar={() => onCambioAbierto(false)}
          onGuardado={(id) => {
            onCambioAbierto(false);
            onGuardado?.(id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

const CLASE_CASILLA = "size-4 accent-brand-secondary";

function GrupoCasillas({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-brand-text">{titulo}</legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-brand-text">
        {children}
      </div>
    </fieldset>
  );
}

function FormularioProveedor({
  proveedor,
  onCancelar,
  onGuardado,
}: {
  proveedor?: Proveedor;
  onCancelar: () => void;
  onGuardado: (id: string) => void;
}) {
  const agregarProveedor = useAppStore((s) => s.agregarProveedor);
  const editarProveedor = useAppStore((s) => s.editarProveedor);
  const padron = useProveedores();
  const plazas = usePlazas().datos ?? [];

  // El RFC del propio proveedor no cuenta como repetido al editarlo.
  const esquema = useMemo(
    () =>
      esquemaProveedor(padron.filter((p) => p.id !== proveedor?.id).map((p) => p.rfc)),
    [padron, proveedor?.id],
  );
  const form = useForm<ProveedorFormulario, unknown, ProveedorValidado>({
    resolver: zodResolver(esquema),
    defaultValues: proveedor ? formularioDeProveedor(proveedor) : PROVEEDOR_VACIO,
    mode: "onChange",
  });
  const {
    register,
    setValue,
    formState: { errors, isValid },
  } = form;

  const guardar = form.handleSubmit((v) => {
    const id =
      proveedor?.id ?? siguienteIdProveedor(useAppStore.getState().proveedores.padron);
    const datos = proveedorDesdeFormulario(v, id);
    if (proveedor) {
      editarProveedor(datos);
      toast.success(`Proveedor ${datos.nombre} actualizado`);
    } else {
      agregarProveedor(datos);
      toast.success(`Proveedor ${datos.nombre} dado de alta`);
    }
    onGuardado(id);
  });

  const marcarPlazas = (ids: string[]) =>
    setValue("plazaIds", ids, { shouldDirty: true, shouldValidate: true });

  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-5" noValidate>
      <DialogHeader>
        <DialogTitle>{proveedor ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
        <DialogDescription>
          Datos fiscales y de contacto, qué atiende en mantenimiento (y en qué plazas) y
          qué partidas de obra puede licitar.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <Campo
          etiqueta="Razón social o nombre"
          htmlFor="proveedor-nombre"
          error={errors.nombre?.message}
        >
          <Input id="proveedor-nombre" {...register("nombre")} />
        </Campo>
        <Campo etiqueta="RFC" htmlFor="proveedor-rfc" error={errors.rfc?.message}>
          <Input
            id="proveedor-rfc"
            placeholder="AAA010101AB1"
            className="uppercase"
            {...register("rfc")}
          />
        </Campo>
        <Campo
          etiqueta="Contacto (opcional)"
          htmlFor="proveedor-contacto"
          error={errors.contactoNombre?.message}
        >
          <Input id="proveedor-contacto" {...register("contactoNombre")} />
        </Campo>
        <Campo
          etiqueta="WhatsApp (opcional)"
          htmlFor="proveedor-whatsapp"
          error={errors.contactoWhatsapp?.message}
        >
          <Input
            id="proveedor-whatsapp"
            inputMode="tel"
            placeholder="667 123 4567"
            {...register("contactoWhatsapp")}
          />
        </Campo>
        <Campo
          etiqueta="Correo (opcional)"
          htmlFor="proveedor-correo"
          error={errors.contactoCorreo?.message}
          className="col-span-2"
        >
          <Input id="proveedor-correo" type="email" {...register("contactoCorreo")} />
        </Campo>
      </div>

      <GrupoCasillas titulo="Especialidades de mantenimiento">
        {OPCIONES_CATEGORIA.map((o) => (
          <label key={o.valor} className="flex items-center gap-2">
            <input
              type="checkbox"
              value={o.valor}
              className={CLASE_CASILLA}
              {...register("especialidadesMantenimiento")}
            />
            {o.etiqueta}
          </label>
        ))}
      </GrupoCasillas>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-brand-text">
          Plazas donde atiende mantenimiento
        </legend>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => marcarPlazas(plazas.map((p) => p.id))}
          >
            Todas
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => marcarPlazas([])}
          >
            Ninguna
          </Button>
        </div>
        <div className="grid max-h-44 grid-cols-3 gap-x-4 gap-y-1.5 overflow-y-auto rounded-lg border border-brand-line p-3 text-sm text-brand-text">
          {plazas.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={p.id}
                className={CLASE_CASILLA}
                {...register("plazaIds")}
              />
              <span className="truncate">{p.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <GrupoCasillas titulo="Partidas de obra">
        {OPCIONES_PARTIDA.map((o) => (
          <label key={o.valor} className="flex items-center gap-2">
            <input
              type="checkbox"
              value={o.valor}
              className={CLASE_CASILLA}
              {...register("partidasObra")}
            />
            {o.etiqueta}
          </label>
        ))}
      </GrupoCasillas>

      <label className="flex items-center gap-2 text-sm text-brand-text">
        <input type="checkbox" className={CLASE_CASILLA} {...register("activo")} />
        Activo (un inactivo no se ofrece en altas de mantenimiento ni en invitaciones)
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!isValid}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          {proveedor ? "Guardar cambios" : "Dar de alta"}
        </Button>
      </DialogFooter>
    </form>
  );
}
