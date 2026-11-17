"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { StatusChip } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { nombreDeUsuario } from "@/config/usuarios";
import { DEMO_TODAY, validarApertura, type Contrato, type Local } from "@/domain";
import { useSesion } from "@/hooks";
import { formatFecha } from "@/lib/format";
import { useAppStore } from "@/store";
import { DialogoRegistrarApertura } from "./dialogo-registrar-apertura";

/**
 * Acción "Registrar apertura" del contrato vigente de un local. Solo se muestra a
 * quien tiene `local.registrarApertura` y si `validarApertura` pasa con la fecha de hoy.
 */
export function BotonRegistrarApertura({
  local,
  contrato,
}: {
  local: Local;
  contrato: Contrato;
}) {
  const { rol } = useSesion();
  const registrarApertura = useAppStore((s) => s.registrarApertura);
  const [abierto, setAbierto] = useState(false);

  if (
    !can(rol, "local.registrarApertura") ||
    !validarApertura(contrato, DEMO_TODAY, DEMO_TODAY).ok
  )
    return null;
  return (
    <>
      <Button variant="outline" className="min-h-11" onClick={() => setAbierto(true)}>
        <Store aria-hidden />
        Registrar apertura
      </Button>
      <DialogoRegistrarApertura
        abierto={abierto}
        onCambioAbierto={setAbierto}
        local={local}
        contrato={contrato}
        onRegistrar={(fecha) => {
          registrarApertura(contrato, fecha);
          toast.success(`Apertura del local ${local.codigo} registrada`);
        }}
      />
    </>
  );
}

/**
 * Estado de apertura del local: "Sin abrir" si `sinAbrir` (calculado con
 * `localesSinAbrir`) o "Abierto desde {fecha}" con quien la registró.
 */
export function ChipApertura({
  contrato,
  sinAbrir,
}: {
  contrato: Contrato | undefined;
  sinAbrir: boolean;
}) {
  if (sinAbrir) return <StatusChip estatus="SIN_ABRIR" />;
  const apertura = contrato?.apertura;
  if (!apertura) return null;
  const quien = nombreDeUsuario(apertura.registradaPor);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusChip
        estatus="ABIERTO"
        etiqueta={`Abierto desde ${formatFecha(apertura.fecha)}`}
      />
      {quien ? (
        <span className="font-sans text-xs font-normal text-brand-text-muted">
          Registró {quien}
        </span>
      ) : null}
    </span>
  );
}
