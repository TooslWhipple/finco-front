"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GaleriaFotos, PanelDetalle, StatusChip } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DEMO_TODAY,
  diasDeAtraso,
  estaAtrasado,
  ETIQUETA_CATEGORIA_MANTENIMIENTO,
  puedeTransicionar,
  type EstatusMantenimiento,
  type Mantenimiento,
} from "@/domain";
import { formatFecha, formatMoneda } from "@/lib/format";
import type { ContextoMantenimiento } from "./contexto";
import {
  DialogoCancelarMantenimiento,
  DialogoFinalizarMantenimiento,
} from "./dialogos-mantenimiento";

export type OnTransicionar = (
  id: string,
  destino: EstatusMantenimiento,
  costoReal?: number,
) => void;

interface DetalleMantenimientoProps {
  mantenimiento: Mantenimiento;
  contexto: ContextoMantenimiento;
  puedeGestionar: boolean;
  onTransicionar: OnTransicionar;
  /** Sin él, el panel no pinta el botón de cerrar (lo cierra su contenedor). */
  onCerrar?: () => void;
  className?: string;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-text-muted">{etiqueta}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  );
}

const ETIQUETA_ORIGEN = {
  ADMINISTRACION: "Administración",
  LOCATARIO: "Locatario",
} as const;
const ETIQUETA_CARGO = { PLAZA: "Plaza", LOCATARIO: "Locatario" } as const;

/**
 * Panel de un mantenimiento: datos, fechas y costos, evidencia en galería y las
 * acciones de transición (iniciar, finalizar con costo real, cancelar).
 */
export function DetalleMantenimiento({
  mantenimiento: m,
  contexto,
  puedeGestionar,
  onTransicionar,
  onCerrar,
  className,
}: DetalleMantenimientoProps) {
  const [finalizando, setFinalizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const local = contexto.local(m.localId);
  const proveedor = contexto.proveedor(m.proveedorId);
  const atrasado = estaAtrasado(m, DEMO_TODAY);

  const iniciar = () => {
    onTransicionar(m.id, "EN_PROCESO");
    toast.success(`${m.folio} pasó a En proceso y se adjuntó evidencia del antes`);
  };

  return (
    <>
      <PanelDetalle
        className={className}
        titulo={m.titulo}
        subtitulo={`${m.folio} · ${ETIQUETA_CATEGORIA_MANTENIMIENTO[m.categoria]}`}
        estado={
          <span className="flex flex-wrap gap-2">
            <StatusChip estatus={m.estatus} />
            {atrasado ? (
              <StatusChip
                estatus="ATRASADO"
                etiqueta={`Atrasado ${diasDeAtraso(m, DEMO_TODAY)} d`}
              />
            ) : null}
            <StatusChip estatus={m.tipo} />
          </span>
        }
        onCerrar={onCerrar}
        secciones={[
          {
            titulo: "Trabajo",
            contenido: (
              <div className="space-y-3">
                {m.descripcion ? <p>{m.descripcion}</p> : null}
                <dl className="grid grid-cols-2 gap-3">
                  <Dato etiqueta="Plaza" valor={contexto.nombrePlaza(m.plazaId)} />
                  <Dato
                    etiqueta="Local"
                    valor={local ? `Local ${local.codigo}` : "Áreas comunes"}
                  />
                  <Dato etiqueta="Proveedor" valor={proveedor?.nombre ?? m.proveedorId} />
                  <Dato etiqueta="Solicitado por" valor={ETIQUETA_ORIGEN[m.origen]} />
                  <Dato etiqueta="Cargo a" valor={ETIQUETA_CARGO[m.cargoA]} />
                </dl>
              </div>
            ),
          },
          {
            titulo: "Fechas y costo",
            contenido: (
              <dl className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Programado" valor={formatFecha(m.fechaProgramada)} />
                <Dato
                  etiqueta="Inicio"
                  valor={m.fechaInicio ? formatFecha(m.fechaInicio) : "—"}
                />
                <Dato etiqueta="Fin" valor={m.fechaFin ? formatFecha(m.fechaFin) : "—"} />
                <Dato etiqueta="Costo estimado" valor={formatMoneda(m.costoEstimado)} />
                <Dato
                  etiqueta="Costo real"
                  valor={m.costoReal !== undefined ? formatMoneda(m.costoReal) : "—"}
                />
              </dl>
            ),
          },
          {
            titulo: "Evidencia",
            contenido: (
              <GaleriaFotos fotos={m.evidencia} titulo={`Evidencia ${m.folio}`} />
            ),
          },
        ]}
        acciones={
          puedeGestionar ? (
            <>
              {puedeTransicionar(m.estatus, "EN_PROCESO") ? (
                <Button
                  onClick={iniciar}
                  className="bg-brand-cta text-white hover:bg-brand-cta-light"
                >
                  Iniciar
                </Button>
              ) : null}
              {puedeTransicionar(m.estatus, "FINALIZADO") ? (
                <Button
                  onClick={() => setFinalizando(true)}
                  className="bg-brand-cta text-white hover:bg-brand-cta-light"
                >
                  Finalizar
                </Button>
              ) : null}
              {puedeTransicionar(m.estatus, "CANCELADO") ? (
                <Button variant="outline" onClick={() => setCancelando(true)}>
                  Cancelar mantenimiento
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />
      {finalizando ? (
        <DialogoFinalizarMantenimiento
          mantenimiento={m}
          abierto
          onCambioAbierto={setFinalizando}
          onFinalizar={(costoReal) => {
            onTransicionar(m.id, "FINALIZADO", costoReal);
            toast.success(
              `${m.folio} finalizado por ${formatMoneda(costoReal)} y se adjuntó evidencia del después`,
            );
          }}
        />
      ) : null}
      {cancelando ? (
        <DialogoCancelarMantenimiento
          mantenimiento={m}
          abierto
          onCambioAbierto={setCancelando}
          onCancelar={() => {
            onTransicionar(m.id, "CANCELADO");
            toast.success(`${m.folio} cancelado`);
          }}
        />
      ) : null}
    </>
  );
}
