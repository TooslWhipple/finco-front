"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  Ayuda,
  KpiCard,
  MoneyAmount,
  SectionCard,
  StatusChip,
  Timeline,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { Cotizacion, ExcepcionPrecio, ImpactoPlanExcepcion, Local } from "@/domain";
import { TEXTOS_PRECIO } from "@/features/local/textos-precio";
import { formatFecha } from "@/lib/format";
import { formatPuntosUnDecimal } from "@/features/local/calculos";
import { useAppStore } from "@/store";
import { eventosExcepcion, impactoExcepcion } from "./calculos";
import { DialogoRechazo } from "./dialogo-rechazo";

interface PanelExcepcionProps {
  excepcion: ExcepcionPrecio;
  cotizacion?: Cotizacion;
  local?: Local;
  plaza?: string;
  /** Meta de cumplimiento del plan de la plaza, en %. */
  metaPct: number;
  /** Simulación sobre el plan de ingresos; ausente si no se conoce el local. */
  simulacion?: ImpactoPlanExcepcion;
  puedeAutorizar: boolean;
  puedeAplicar: boolean;
}

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-brand-text-muted">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm font-medium text-brand-text">{children}</dd>
    </div>
  );
}

/** Detalle de una excepción: datos, simulación contra el plan, línea de tiempo y acciones del paso que toca. */
export function PanelExcepcion({
  excepcion,
  cotizacion,
  local,
  plaza,
  metaPct,
  simulacion,
  puedeAutorizar,
  puedeAplicar,
}: PanelExcepcionProps) {
  const autorizar = useAppStore((s) => s.autorizarExcepcion);
  const aplicar = useAppStore((s) => s.aplicarExcepcion);
  const rechazar = useAppStore((s) => s.rechazarExcepcion);
  const [rechazando, setRechazando] = useState(false);

  const precioLista = local?.precioVigente ?? excepcion.precioMinimo;
  const impacto = impactoExcepcion(excepcion, precioLista, cotizacion?.plazoMeses ?? 0);
  const toca =
    excepcion.estado === "PENDIENTE" && puedeAutorizar
      ? "AUTORIZAR"
      : excepcion.estado === "AUTORIZADA_DIRECCION" && puedeAplicar
        ? "APLICAR"
        : undefined;

  function confirmar() {
    if (toca === "AUTORIZAR") {
      autorizar(excepcion.id);
      toast.success("Excepción autorizada. Ahora la PMO debe aplicarla.");
    } else {
      aplicar(excepcion.id);
      toast.success("Excepción aplicada. Ventas ya puede generar el contrato.");
    }
  }

  return (
    <SectionCard
      titulo={`Excepción de ${local?.codigo ?? excepcion.localId}`}
      extra={<StatusChip estatus={excepcion.estado} />}
    >
      <dl className="grid grid-cols-2 gap-4">
        <Dato etiqueta="Cotización">
          {cotizacion ? (
            <Link
              href={`/cotizaciones/${excepcion.cotizacionId}`}
              className="text-brand-primary hover:underline"
            >
              {excepcion.cotizacionId}
            </Link>
          ) : (
            excepcion.cotizacionId
          )}
        </Dato>
        <Dato etiqueta="Local">
          {local?.codigo ?? excepcion.localId}
          {plaza ? ` · ${plaza}` : ""}
        </Dato>
        <Dato etiqueta="Prospecto">{cotizacion?.prospecto.nombre ?? "—"}</Dato>
        <Dato etiqueta="Solicitada por">{excepcion.solicitadaPor}</Dato>
        <Dato
          etiqueta={
            <Ayuda texto={TEXTOS_PRECIO.lista.ayuda}>
              {TEXTOS_PRECIO.lista.etiqueta}
            </Ayuda>
          }
        >
          <MoneyAmount valor={precioLista} sufijo="/mes" />
        </Dato>
        <Dato
          etiqueta={
            <Ayuda texto={TEXTOS_PRECIO.minimo.ayuda}>
              {TEXTOS_PRECIO.minimo.etiqueta}
            </Ayuda>
          }
        >
          <MoneyAmount valor={excepcion.precioMinimo} sufijo="/mes" />
        </Dato>
        <Dato etiqueta="Renta ofrecida">
          <MoneyAmount valor={excepcion.rentaSolicitada} sufijo="/mes" />
        </Dato>
        <Dato etiqueta="Contra el mínimo">
          <MoneyAmount
            valor={impacto.diferenciaVsMinimo}
            conSigno
            className="text-brand-danger"
          />
        </Dato>
      </dl>

      {simulacion ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-brand-text-muted">
            Impacto en el plan de ingresos de {plaza ?? "la plaza"}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              etiqueta="Cumplimiento del plan"
              valor={`${formatPuntosUnDecimal(simulacion.cumplimientoActualPct)} → ${formatPuntosUnDecimal(simulacion.cumplimientoNuevoPct)}`}
              detalle={
                simulacion.bajoMeta
                  ? `Bajo la meta de ${formatPuntosUnDecimal(metaPct)}`
                  : `Cumple la meta de ${formatPuntosUnDecimal(metaPct)}`
              }
              tono={simulacion.bajoMeta ? "peligro" : "positivo"}
            />
            <KpiCard
              etiqueta="Impacto mensual"
              valor={<MoneyAmount valor={-simulacion.impactoMensual} conSigno />}
              subtexto="contra la renta planeada"
            />
            <KpiCard
              etiqueta={`En el contrato (${cotizacion?.plazoMeses ?? "—"} meses)`}
              valor={<MoneyAmount valor={-simulacion.impactoVida} conSigno />}
              subtexto="en la vida del contrato"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-brand-text-muted">Línea de tiempo</p>
        <Timeline
          eventos={eventosExcepcion(excepcion).map((e) => ({
            id: e.id,
            titulo: e.titulo,
            detalle: e.detalle,
            fecha: e.fecha ? formatFecha(e.fecha) : undefined,
            tono: e.tono,
          }))}
        />
      </div>

      {toca ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRechazando(true)}>
            <X aria-hidden /> Rechazar
          </Button>
          <Button onClick={confirmar}>
            <Check aria-hidden /> {toca === "AUTORIZAR" ? "Autorizar" : "Aplicar"}
          </Button>
        </div>
      ) : null}
      <DialogoRechazo
        abierto={rechazando}
        onCambioAbierto={setRechazando}
        destinatario={toca === "AUTORIZAR" ? "Ventas" : "Ventas y Dirección"}
        onConfirmar={(comentario) => {
          rechazar(excepcion.id, comentario);
          toast.success("Excepción rechazada");
        }}
      />
    </SectionCard>
  );
}
