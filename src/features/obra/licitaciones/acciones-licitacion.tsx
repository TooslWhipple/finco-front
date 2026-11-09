"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import type { Licitacion, ProveedorObra, Rol } from "@/domain";
import { proveedoresActivos } from "@/domain";
import { useAppStore } from "@/store";
import { DialogoAdjudicar } from "./dialogo-adjudicar";
import { DialogoDescarte } from "./dialogo-descarte";
import { DialogoRonda } from "./dialogo-ronda";

type Dialogo = "ronda" | "descarte" | "adjudicar" | null;

interface AccionesLicitacionProps {
  licitacion: Licitacion;
  proveedores: readonly ProveedorObra[];
  rol: Rol | null;
}

/** Acciones de la PMO sobre una licitación en curso; sin permiso o ya adjudicada no se muestra nada. */
export function AccionesLicitacion({
  licitacion,
  proveedores,
  rol,
}: AccionesLicitacionProps) {
  const registrarRonda = useAppStore((s) => s.registrarRonda);
  const descartarProveedor = useAppStore((s) => s.descartarProveedor);
  const adjudicarLicitacion = useAppStore((s) => s.adjudicarLicitacion);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  if (licitacion.estado !== "EN_CURSO" || !can(rol, "licitacion.gestionar")) return null;
  const activos = proveedoresActivos(licitacion).length;
  const cerrar = (abierto: boolean) => {
    if (!abierto) setDialogo(null);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setDialogo("ronda")}
          disabled={activos === 0}
        >
          Registrar ronda
        </Button>
        <Button
          variant="outline"
          onClick={() => setDialogo("descarte")}
          disabled={activos <= 1}
        >
          Descartar proveedor
        </Button>
        <Button
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
          onClick={() => setDialogo("adjudicar")}
          disabled={licitacion.rondas.length === 0}
        >
          Adjudicar
        </Button>
      </div>
      {dialogo === "ronda" ? (
        <DialogoRonda
          abierto
          onCambioAbierto={cerrar}
          licitacion={licitacion}
          proveedores={proveedores}
          onRegistrar={(entrada) => {
            registrarRonda(licitacion.id, entrada);
            toast.success(`Ronda ${licitacion.rondas.length + 1} registrada`);
          }}
        />
      ) : null}
      {dialogo === "descarte" ? (
        <DialogoDescarte
          abierto
          onCambioAbierto={cerrar}
          licitacion={licitacion}
          proveedores={proveedores}
          onDescartar={(proveedorId, motivo) => {
            descartarProveedor(licitacion.id, proveedorId, motivo);
            toast.success("Proveedor descartado");
          }}
        />
      ) : null}
      {dialogo === "adjudicar" ? (
        <DialogoAdjudicar
          abierto
          onCambioAbierto={cerrar}
          licitacion={licitacion}
          proveedores={proveedores}
          onAdjudicar={(ganadorId, motivo) => {
            adjudicarLicitacion(licitacion.id, ganadorId, motivo);
            toast.success(`${licitacion.folio} adjudicada`);
          }}
        />
      ) : null}
    </>
  );
}
