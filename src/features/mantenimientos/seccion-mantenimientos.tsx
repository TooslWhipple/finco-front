"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { useMantenimientos, useSesion } from "@/hooks";
import { useAppStore } from "@/store";
import { useContextoMantenimiento } from "./contexto";
import { DetalleMantenimiento } from "./detalle-mantenimiento";
import { DialogoNuevoMantenimiento } from "./dialogos-mantenimiento";
import { KpisMantenimiento } from "./kpis-mantenimiento";
import { PanelPresupuestos } from "./panel-presupuestos";
import { TablaMantenimientos } from "./tabla-mantenimientos";

interface SeccionMantenimientosProps {
  /** Ubicación que acota los datos; el alta la precarga. */
  filtro: { plazaId?: string; localId?: string };
  /** Muestra los KPIs sobre la tabla (pestaña de la plaza). */
  conKpis?: boolean;
  /** Tabla corta para una ficha. */
  compacta?: boolean;
}

/**
 * Mantenimientos de una plaza o de un local: KPIs opcionales, tabla, alta y
 * detalle (en un Dialog, porque vive dentro de una página con su propio layout).
 */
export function SeccionMantenimientos({
  filtro,
  conKpis = false,
  compacta = false,
}: SeccionMantenimientosProps) {
  const { rol } = useSesion();
  const { plazaId, localId } = filtro;
  const lista = useMantenimientos(filtro).datos;
  const contexto = useContextoMantenimiento(plazaId);
  const crearMantenimiento = useAppStore((s) => s.crearMantenimiento);
  const transicionarMantenimiento = useAppStore((s) => s.transicionarMantenimiento);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const ordenados = useMemo(
    () => [...lista].sort((a, b) => b.fechaProgramada.localeCompare(a.fechaProgramada)),
    [lista],
  );
  const seleccionado = lista.find((m) => m.id === seleccionadoId);
  const puedeGestionar = can(rol, "mantenimientos.gestionar");
  const plazasAlta = useMemo(
    () => contexto.plazas.filter((p) => p.estatus === "EN_OPERACION"),
    [contexto.plazas],
  );
  // La ficha de un local acota por local; sin plaza fija se toma la del propio local.
  const filtroAlta = { plazaId, localId };

  return (
    <div className="space-y-4">
      {conKpis ? <KpisMantenimiento mantenimientos={lista} /> : null}
      {conKpis && plazaId ? (
        <PanelPresupuestos contexto={contexto} plazaId={plazaId} />
      ) : null}
      {puedeGestionar ? (
        <div className="flex justify-end">
          <Button
            onClick={() => setCreando(true)}
            className="bg-brand-cta text-white hover:bg-brand-cta-light"
          >
            <Plus aria-hidden />
            Nuevo mantenimiento
          </Button>
        </div>
      ) : null}
      <TablaMantenimientos
        mantenimientos={ordenados}
        contexto={contexto}
        filtro={filtro}
        compacta={compacta}
        tamanoPagina={compacta ? 5 : 10}
        onSeleccionar={(m) => setSeleccionadoId(m.id)}
        vacio={localId ? "Este local no tiene mantenimientos" : "Sin mantenimientos"}
      />
      {seleccionado ? (
        <Dialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setSeleccionadoId(null);
          }}
        >
          <DialogContent
            showCloseButton
            className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl"
          >
            <DialogTitle className="sr-only">{seleccionado.titulo}</DialogTitle>
            <DetalleMantenimiento
              mantenimiento={seleccionado}
              contexto={contexto}
              puedeGestionar={puedeGestionar}
              onTransicionar={transicionarMantenimiento}
              className="border-0 shadow-none"
            />
          </DialogContent>
        </Dialog>
      ) : null}
      {creando ? (
        <DialogoNuevoMantenimiento
          abierto
          onCambioAbierto={setCreando}
          plazas={plazasAlta}
          proveedores={contexto.proveedores}
          filtro={filtroAlta}
          onCrear={crearMantenimiento}
        />
      ) : null}
    </div>
  );
}
