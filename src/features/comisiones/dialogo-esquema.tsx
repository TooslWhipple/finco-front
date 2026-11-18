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
import { nombreDeUsuario } from "@/config/usuarios";
import type { EsquemaComisiones } from "@/domain";
import { useEsquemaComisiones } from "@/hooks";
import { useAppStore } from "@/store";
import { Campo } from "@/features/cotizacion/campo";
import {
  esquemaComisiones,
  MANDOS_MEDIOS_ELEGIBLES,
  type EsquemaComisionesFormulario,
} from "./esquemas";

interface DialogoEsquemaProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
}

/** Edición del esquema de comisiones (solo con `comisiones.esquemaEditar`). */
export function DialogoEsquema({ abierto, onCambioAbierto }: DialogoEsquemaProps) {
  const esquema = useEsquemaComisiones();
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-w-lg">
        {abierto ? (
          <FormularioEsquema
            esquema={esquema}
            onCancelar={() => onCambioAbierto(false)}
            onGuardado={() => onCambioAbierto(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const CAMPOS_PORCENTAJE = [
  { campo: "asesorPct", etiqueta: "Asesor (%)", ayuda: "Del vendedor que cerró." },
  {
    campo: "bonoSinExcepcionPct",
    etiqueta: "Bono sin excepción (%)",
    ayuda: "Extra si no hubo excepción de precio aplicada.",
  },
  { campo: "mandoMedioPct", etiqueta: "Mando medio (%)", ayuda: "Por cada mando medio." },
] as const satisfies readonly {
  campo: keyof Omit<EsquemaComisiones, "mandosMedios">;
  etiqueta: string;
  ayuda: string;
}[];

function FormularioEsquema({
  esquema,
  onCancelar,
  onGuardado,
}: {
  esquema: EsquemaComisiones;
  onCancelar: () => void;
  onGuardado: () => void;
}) {
  const editarEsquema = useAppStore((s) => s.editarEsquemaComisiones);
  const form = useForm<EsquemaComisionesFormulario, unknown, EsquemaComisiones>({
    resolver: zodResolver(esquemaComisiones),
    defaultValues: { ...esquema, mandosMedios: [...esquema.mandosMedios] },
    mode: "onChange",
  });
  const {
    register,
    control,
    setValue,
    formState: { errors, isValid },
  } = form;
  const mandosMedios = useWatch({ control, name: "mandosMedios" });

  const alternarMando = (id: string, marcado: boolean) => {
    const siguientes = marcado
      ? MANDOS_MEDIOS_ELEGIBLES.filter((m) => m === id || mandosMedios.includes(m))
      : mandosMedios.filter((m) => m !== id);
    setValue("mandosMedios", siguientes, { shouldValidate: true, shouldDirty: true });
  };

  const guardar = form.handleSubmit((v) => {
    editarEsquema(v);
    toast.success("Esquema de comisiones actualizado");
    onGuardado();
  });

  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-4" noValidate>
      <DialogHeader>
        <DialogTitle>Editar esquema de comisiones</DialogTitle>
        <DialogDescription>
          Aplica a los contratos que se firmen de aquí en adelante; las comisiones ya
          generadas no cambian.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CAMPOS_PORCENTAJE.map(({ campo, etiqueta, ayuda }) => (
          <Campo
            key={campo}
            etiqueta={etiqueta}
            htmlFor={`esquema-${campo}`}
            error={errors[campo]?.message}
            ayuda={ayuda}
          >
            <Input
              id={`esquema-${campo}`}
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.1}
              {...register(campo, { valueAsNumber: true })}
            />
          </Campo>
        ))}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-brand-text">Mandos medios</legend>
        {MANDOS_MEDIOS_ELEGIBLES.map((id) => (
          <label key={id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-brand-secondary"
              checked={mandosMedios.includes(id)}
              onChange={(e) => alternarMando(id, e.target.checked)}
            />
            {nombreDeUsuario(id)}
          </label>
        ))}
        {errors.mandosMedios?.message ? (
          <p role="alert" className="text-xs text-brand-danger">
            {errors.mandosMedios.message}
          </p>
        ) : null}
      </fieldset>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!isValid}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Guardar esquema
        </Button>
      </DialogFooter>
    </form>
  );
}
