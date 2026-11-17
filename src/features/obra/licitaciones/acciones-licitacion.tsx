"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import type { FechasContrato, Licitacion, Proveedor, Rol } from "@/domain";
import {
  catalogoEditable,
  errorCierreRonda,
  proveedoresActivos,
  rondaAbierta,
  tieneCatalogo,
} from "@/domain";
import { ETIQUETA_CANAL } from "@/features/cobranza/controles-programacion";
import { useAppStore } from "@/store";
import { DialogoAdjudicar } from "./dialogo-adjudicar";
import { DialogoDescarte } from "./dialogo-descarte";
import { DialogoInvitaciones } from "./dialogo-invitaciones";
import { DialogoRespuesta, DialogoRonda } from "./dialogo-ronda";
import { DialogoCatalogo } from "./editor-catalogo";

type Dialogo =
  "ronda" | "descarte" | "adjudicar" | "catalogo" | "invitaciones" | "respuesta" | null;

interface AccionesLicitacionProps {
  licitacion: Licitacion;
  proveedores: readonly Proveedor[];
  rol: Rol | null;
  /** Abre la pestaña de contratos con el contrato que nació al adjudicar. */
  abrirContrato?: (contratoId: string) => void;
}

const CTA = "h-11 bg-brand-cta text-white hover:bg-brand-cta-light";

/**
 * Acciones de la PMO sobre una licitación en curso; sin permiso o ya adjudicada no
 * se muestra nada. Sin catálogo, las rondas se registran por total; con catálogo,
 * se invita por el portal, se capturan precios unitarios y se cierra la ronda.
 */
export function AccionesLicitacion({
  licitacion,
  proveedores,
  rol,
  abrirContrato,
}: AccionesLicitacionProps) {
  const registrarRonda = useAppStore((s) => s.registrarRonda);
  const descartarProveedor = useAppStore((s) => s.descartarProveedor);
  const adjudicarLicitacion = useAppStore((s) => s.adjudicarLicitacion);
  const definirCatalogo = useAppStore((s) => s.definirCatalogo);
  const enviarInvitaciones = useAppStore((s) => s.enviarInvitaciones);
  const responderLicitacion = useAppStore((s) => s.responderLicitacion);
  const cerrarRonda = useAppStore((s) => s.cerrarRonda);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  if (licitacion.estado !== "EN_CURSO" || !can(rol, "licitacion.gestionar")) return null;
  const activos = proveedoresActivos(licitacion).length;
  const conCatalogo = tieneCatalogo(licitacion);
  const abierta = rondaAbierta(licitacion);
  const errorCierre = abierta ? errorCierreRonda(licitacion) : undefined;
  const cerrar = (abierto: boolean) => {
    if (!abierto) setDialogo(null);
  };

  const adjudicar = (ganadorId: string, motivo: string, fechas?: FechasContrato) => {
    adjudicarLicitacion(licitacion.id, ganadorId, motivo, fechas);
    const actual = useAppStore
      .getState()
      .obra.licitaciones.find((l) => l.id === licitacion.id);
    if (actual?.estado !== "ADJUDICADA") {
      toast.error(`No se pudo adjudicar ${licitacion.folio}`);
      return;
    }
    if (actual.contratoObraId) {
      const contrato = useAppStore
        .getState()
        .obra.contratos.find((c) => c.id === actual.contratoObraId);
      toast.success(
        `${licitacion.folio} adjudicada: nació el contrato ${contrato?.folio ?? ""}`,
      );
      abrirContrato?.(actual.contratoObraId);
      return;
    }
    toast.success(`${licitacion.folio} adjudicada`);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {conCatalogo ? null : (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setDialogo("ronda")}
            disabled={activos === 0}
          >
            Registrar ronda
          </Button>
        )}
        <Button variant="outline" className="h-11" onClick={() => setDialogo("catalogo")}>
          {!conCatalogo
            ? "Armar catálogo"
            : catalogoEditable(licitacion)
              ? "Editar catálogo"
              : "Ver catálogo"}
        </Button>
        {conCatalogo ? (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setDialogo("invitaciones")}
          >
            {abierta ? "Reenviar invitaciones" : "Enviar invitaciones"}
          </Button>
        ) : null}
        {abierta ? (
          <>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setDialogo("respuesta")}
            >
              Capturar respuesta
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={errorCierre !== undefined}
              title={errorCierre}
              onClick={() => {
                cerrarRonda(licitacion.id);
                toast.success(`Ronda ${abierta.numero} cerrada`);
              }}
            >
              Cerrar ronda {abierta.numero}
            </Button>
          </>
        ) : null}
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setDialogo("descarte")}
          disabled={activos <= 1 || abierta !== undefined}
          title={abierta ? "Cierra la ronda abierta." : undefined}
        >
          Descartar proveedor
        </Button>
        <Button
          className={CTA}
          onClick={() => setDialogo("adjudicar")}
          disabled={licitacion.rondas.length === 0 || abierta !== undefined}
          title={abierta ? "Cierra la ronda abierta." : undefined}
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
      {dialogo === "catalogo" ? (
        <DialogoCatalogo
          abierto
          onCambioAbierto={cerrar}
          licitacion={licitacion}
          onGuardar={(conceptos) => {
            definirCatalogo(licitacion.id, conceptos);
            toast.success(`Catálogo de ${licitacion.folio} guardado`);
          }}
        />
      ) : null}
      {dialogo === "invitaciones" ? (
        <DialogoInvitaciones
          abierto
          onCambioAbierto={cerrar}
          licitacion={licitacion}
          proveedores={proveedores}
          onEnviar={(ids, canal) => {
            enviarInvitaciones(licitacion.id, ids, canal);
            const numero = abierta?.numero ?? licitacion.rondas.length + 1;
            toast.success(
              `${ids.length} ${ids.length === 1 ? "invitación enviada" : "invitaciones enviadas"} por ${ETIQUETA_CANAL[canal]} · ronda ${numero} abierta (simulado)`,
            );
          }}
        />
      ) : null}
      {dialogo === "respuesta" ? (
        <DialogoRespuesta
          abierto
          onCambioAbierto={cerrar}
          licitacion={licitacion}
          proveedores={proveedores}
          onCapturar={(proveedorId, precios) => {
            responderLicitacion(licitacion.id, proveedorId, precios);
            toast.success("Respuesta capturada por PMO");
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
          onAdjudicar={adjudicar}
        />
      ) : null}
    </>
  );
}
