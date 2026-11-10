"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { DEMO_TODAY, siguienteIdProspecto } from "@/domain";
import { useLocales, usePlazas, useSesion } from "@/hooks";
import { useAppStore } from "@/store";
import { Campo, CLASE_SELECT } from "@/features/cotizacion/campo";
import {
  OPCIONES_ORIGEN,
  esquemaNuevoProspecto,
  prospectoDesdeFormulario,
  type NuevoProspectoFormulario,
  type NuevoProspectoValidado,
} from "./esquemas";

interface DialogoRegistrarProspectoProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** Se llama con el id del prospecto recién registrado. */
  onRegistrado: (id: string) => void;
}

export function DialogoRegistrarProspecto({
  abierto,
  onCambioAbierto,
  onRegistrado,
}: DialogoRegistrarProspectoProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-w-2xl">
        <FormularioProspecto
          onCancelar={() => onCambioAbierto(false)}
          onRegistrado={(id) => {
            onCambioAbierto(false);
            onRegistrado(id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

const VALORES_INICIALES: NuevoProspectoFormulario = {
  nombre: "",
  rfc: "",
  giro: "",
  contactoNombre: "",
  telefono: "",
  correo: "",
  origen: "REFERIDO",
  plazaId: "",
  localId: "",
  documentosCompletos: false,
  avalRegistrado: false,
};

function FormularioProspecto({
  onCancelar,
  onRegistrado,
}: {
  onCancelar: () => void;
  onRegistrado: (id: string) => void;
}) {
  const registrarProspecto = useAppStore((s) => s.registrarProspecto);
  const { usuario } = useSesion();
  const plazas = usePlazas().datos ?? [];

  const form = useForm<NuevoProspectoFormulario, unknown, NuevoProspectoValidado>({
    resolver: zodResolver(esquemaNuevoProspecto),
    defaultValues: VALORES_INICIALES,
    mode: "onChange",
  });
  const {
    register,
    setValue,
    formState: { errors, isValid },
  } = form;
  const plazaId = useWatch({ control: form.control, name: "plazaId" });
  const locales = useLocales(plazaId || undefined);
  const conInteres = (plazaId ? (locales.datos ?? []) : []).filter(
    (l) =>
      l.estatus === "DISPONIBLE" ||
      l.estatus === "EN_COTIZACION" ||
      l.estatus === "PREVENTA",
  );

  const registrar = form.handleSubmit((v) => {
    if (!usuario) return;
    // El id sale de todos los prospectos del store, no solo de los visibles para este vendedor.
    const id = siguienteIdProspecto(useAppStore.getState().prospectos.prospectos);
    registrarProspecto(prospectoDesdeFormulario(v, id, DEMO_TODAY, usuario.id));
    toast.success(`Prospecto ${v.nombre} registrado`, {
      description: "Entró al embudo en la etapa Nuevo.",
    });
    onRegistrado(id);
  });

  return (
    <form onSubmit={(e) => void registrar(e)} className="space-y-4" noValidate>
      <DialogHeader>
        <DialogTitle>Registrar prospecto</DialogTitle>
        <DialogDescription>
          Captura los datos de contacto y el local que le interesa. Entra al embudo como
          Nuevo.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <Campo
          etiqueta="Razón social o nombre"
          htmlFor="prospecto-nombre"
          error={errors.nombre?.message}
        >
          <Input id="prospecto-nombre" {...register("nombre")} />
        </Campo>
        <Campo etiqueta="RFC" htmlFor="prospecto-rfc" error={errors.rfc?.message}>
          <Input
            id="prospecto-rfc"
            placeholder="AAA010101AB1"
            className="uppercase"
            {...register("rfc")}
          />
        </Campo>
        <Campo etiqueta="Giro" htmlFor="prospecto-giro" error={errors.giro?.message}>
          <Input id="prospecto-giro" placeholder="Cafetería" {...register("giro")} />
        </Campo>
        <Campo
          etiqueta="Origen"
          htmlFor="prospecto-origen"
          error={errors.origen?.message}
        >
          <select id="prospecto-origen" className={CLASE_SELECT} {...register("origen")}>
            {OPCIONES_ORIGEN.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Contacto"
          htmlFor="prospecto-contacto"
          error={errors.contactoNombre?.message}
        >
          <Input id="prospecto-contacto" {...register("contactoNombre")} />
        </Campo>
        <Campo
          etiqueta="Teléfono"
          htmlFor="prospecto-telefono"
          error={errors.telefono?.message}
        >
          <Input
            id="prospecto-telefono"
            inputMode="tel"
            placeholder="667 123 4567"
            {...register("telefono")}
          />
        </Campo>
        <Campo
          etiqueta="Correo"
          htmlFor="prospecto-correo"
          error={errors.correo?.message}
          className="col-span-2"
        >
          <Input id="prospecto-correo" type="email" {...register("correo")} />
        </Campo>
        <Campo etiqueta="Plaza" htmlFor="prospecto-plaza" error={errors.plazaId?.message}>
          <select
            id="prospecto-plaza"
            className={CLASE_SELECT}
            {...register("plazaId", {
              onChange: () => setValue("localId", "", { shouldValidate: true }),
            })}
          >
            <option value="">Elige una plaza</option>
            {plazas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Local de interés"
          htmlFor="prospecto-local"
          error={errors.localId?.message}
          ayuda={
            plazaId && !locales.cargando && conInteres.length === 0
              ? "Esta plaza no tiene locales por colocar."
              : undefined
          }
        >
          <select
            id="prospecto-local"
            className={CLASE_SELECT}
            disabled={!plazaId}
            {...register("localId")}
          >
            <option value="">Elige un local</option>
            {conInteres.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo} · {l.areaM2} m²
              </option>
            ))}
          </select>
        </Campo>
        <label className="col-span-2 flex items-center gap-2 text-sm text-brand-text">
          <input
            type="checkbox"
            className="size-4 accent-brand-secondary"
            {...register("documentosCompletos")}
          />
          Expediente completo (acta, RFC, identificación, comprobante)
        </label>
        <label className="col-span-2 flex items-center gap-2 text-sm text-brand-text">
          <input
            type="checkbox"
            className="size-4 accent-brand-secondary"
            {...register("avalRegistrado")}
          />
          Aval / fianza registrada
        </label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!isValid}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Registrar prospecto
        </Button>
      </DialogFooter>
    </form>
  );
}
