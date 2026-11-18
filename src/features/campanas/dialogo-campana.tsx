"use client";

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
import { ETIQUETA_ORIGEN_PROSPECTO, siguienteIdCampana, type Campana } from "@/domain";
import { useAppStore } from "@/store";
import { Campo, CLASE_SELECT } from "@/features/cotizacion/campo";
import {
  CAMPANA_VACIA,
  OPCIONES_CANAL,
  campanaDesdeFormulario,
  esquemaCampana,
  formularioDeCampana,
  type CampanaFormulario,
  type CampanaValidada,
} from "./esquemas";

interface DialogoCampanaProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  /** Campaña a editar; sin ella, el diálogo da de alta una nueva. */
  campana?: Campana;
  /**
   * La campaña ya tiene prospectos ligados: su canal no cambia, para que siga
   * siendo el origen de esos prospectos.
   */
  canalBloqueado?: boolean;
}

/** Alta o edición de una campaña comercial (solo con `campanas.gestionar`). */
export function DialogoCampana({
  abierto,
  onCambioAbierto,
  campana,
  canalBloqueado = false,
}: DialogoCampanaProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-w-xl">
        <FormularioCampana
          // Al cambiar de campaña el formulario se reinicia con sus datos.
          key={campana?.id ?? "nueva"}
          campana={campana}
          canalBloqueado={campana !== undefined && canalBloqueado}
          onCancelar={() => onCambioAbierto(false)}
          onGuardado={() => onCambioAbierto(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioCampana({
  campana,
  canalBloqueado,
  onCancelar,
  onGuardado,
}: {
  campana?: Campana;
  canalBloqueado: boolean;
  onCancelar: () => void;
  onGuardado: () => void;
}) {
  const agregarCampana = useAppStore((s) => s.agregarCampana);
  const editarCampana = useAppStore((s) => s.editarCampana);

  const form = useForm<CampanaFormulario, unknown, CampanaValidada>({
    resolver: zodResolver(esquemaCampana),
    defaultValues: campana ? formularioDeCampana(campana) : CAMPANA_VACIA,
    mode: "onChange",
  });
  const {
    register,
    formState: { errors, isValid },
  } = form;

  const guardar = form.handleSubmit((v) => {
    const id = campana?.id ?? siguienteIdCampana(useAppStore.getState().campanas.campanas);
    // Con prospectos ligados el canal se conserva aunque el formulario traiga otro.
    const datos = campanaDesdeFormulario(
      canalBloqueado && campana ? { ...v, canal: campana.canal } : v,
      id,
    );
    if (campana) {
      editarCampana(datos);
      toast.success(`Campaña ${datos.nombre} actualizada`);
    } else {
      agregarCampana(datos);
      toast.success(`Campaña ${datos.nombre} dada de alta`);
    }
    onGuardado();
  });

  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-4" noValidate>
      <DialogHeader>
        <DialogTitle>{campana ? "Editar campaña" : "Nueva campaña"}</DialogTitle>
        <DialogDescription>
          Nombre, canal, vigencia e inversión. Los prospectos que llegan por la campaña
          toman su canal como origen.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <Campo
          etiqueta="Nombre"
          htmlFor="campana-nombre"
          error={errors.nombre?.message}
          className="col-span-2"
        >
          <Input id="campana-nombre" {...register("nombre")} />
        </Campo>
        <Campo
          etiqueta="Canal"
          htmlFor="campana-canal"
          error={errors.canal?.message}
          ayuda={
            canalBloqueado ? "Tiene prospectos ligados: el canal no cambia." : undefined
          }
        >
          {canalBloqueado && campana ? (
            <Input
              id="campana-canal"
              readOnly
              value={ETIQUETA_ORIGEN_PROSPECTO[campana.canal]}
            />
          ) : (
            <select id="campana-canal" className={CLASE_SELECT} {...register("canal")}>
              {OPCIONES_CANAL.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo
          etiqueta="Inversión (MXN)"
          htmlFor="campana-inversion"
          error={errors.inversion?.message}
        >
          <Input
            id="campana-inversion"
            inputMode="decimal"
            placeholder="15000"
            {...register("inversion")}
          />
        </Campo>
        <Campo etiqueta="Inicio" htmlFor="campana-inicio" error={errors.inicio?.message}>
          <Input
            id="campana-inicio"
            type="date"
            {...register("inicio", { deps: ["fin"] })}
          />
        </Campo>
        <Campo etiqueta="Fin (opcional)" htmlFor="campana-fin" error={errors.fin?.message}>
          <Input id="campana-fin" type="date" {...register("fin")} />
        </Campo>
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
          {campana ? "Guardar cambios" : "Dar de alta"}
        </Button>
      </DialogFooter>
    </form>
  );
}
