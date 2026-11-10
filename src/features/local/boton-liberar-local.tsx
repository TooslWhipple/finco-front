"use client";

import { useState } from "react";
import { DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import type { Contrato, Local } from "@/domain";
import { useSesion } from "@/hooks";
import { useAppStore } from "@/store";
import { DialogoLiberarLocal } from "./dialogo-liberar-local";

/**
 * Acción "Liberar local" de un contrato vigente. Solo se muestra a quien tiene
 * `local.liberar`; el diálogo confirma con la vista previa del repricing.
 */
export function BotonLiberarLocal({
  local,
  contrato,
}: {
  local: Local;
  contrato: Contrato;
}) {
  const { rol } = useSesion();
  const liberarLocal = useAppStore((s) => s.liberarLocal);
  const [abierto, setAbierto] = useState(false);

  if (contrato.estado !== "VIGENTE" || !can(rol, "local.liberar")) return null;
  return (
    <>
      <Button variant="outline" className="min-h-11" onClick={() => setAbierto(true)}>
        <DoorOpen aria-hidden />
        Liberar local
      </Button>
      <DialogoLiberarLocal
        abierto={abierto}
        onCambioAbierto={setAbierto}
        local={local}
        contrato={contrato}
        onLiberar={(fecha, motivo) => {
          liberarLocal(local, contrato, fecha, motivo);
          toast.success(`Local ${local.codigo} liberado: precio actualizado`);
        }}
      />
    </>
  );
}
