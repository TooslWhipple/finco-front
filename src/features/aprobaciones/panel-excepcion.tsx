"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { MoneyAmount, SectionCard, StatusChip } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Cotizacion, ExcepcionPrecio, Local } from "@/domain";
import { useAppStore } from "@/store";
import { impactoExcepcion } from "./calculos";

interface PanelExcepcionProps {
  excepcion: ExcepcionPrecio;
  cotizacion?: Cotizacion;
  local?: Local;
  plaza?: string;
  puedeResolver: boolean;
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-brand-text-muted">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm font-medium text-brand-text">{children}</dd>
    </div>
  );
}

export function PanelExcepcion({
  excepcion,
  cotizacion,
  local,
  plaza,
  puedeResolver,
}: PanelExcepcionProps) {
  const resolver = useAppStore((s) => s.resolverExcepcion);
  const [rechazando, setRechazando] = useState(false);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string>();

  const pendiente = excepcion.estado === "PENDIENTE";
  const precioLista = local?.precioVigente ?? excepcion.precioMinimo;
  const impacto = impactoExcepcion(excepcion, precioLista, cotizacion?.plazoMeses ?? 0);

  function aprobar() {
    resolver(excepcion.id, "APROBADA");
    toast.success(`Excepción aprobada. Ventas ya puede generar el contrato.`);
  }

  function rechazar(evento: FormEvent) {
    evento.preventDefault();
    const texto = comentario.trim();
    if (texto.length === 0) {
      setError("Escribe el motivo del rechazo");
      return;
    }
    resolver(excepcion.id, "RECHAZADA", texto);
    toast.success("Excepción rechazada");
    setRechazando(false);
    setComentario("");
    setError(undefined);
  }

  return (
    <SectionCard
      titulo={`Excepción de ${local?.codigo ?? excepcion.localId}`}
      extra={<StatusChip estatus={excepcion.estado} />}
    >
      <dl className="grid grid-cols-2 gap-4">
        <Dato etiqueta="Cotización">
          <Link
            href={`/cotizaciones/${excepcion.cotizacionId}`}
            className="text-brand-primary hover:underline"
          >
            {excepcion.cotizacionId}
          </Link>
        </Dato>
        <Dato etiqueta="Local">
          {local?.codigo ?? excepcion.localId}
          {plaza ? ` · ${plaza}` : ""}
        </Dato>
        <Dato etiqueta="Prospecto">{cotizacion?.prospecto.nombre ?? "—"}</Dato>
        <Dato etiqueta="Solicitada por">{excepcion.solicitadaPor}</Dato>
        <Dato etiqueta="Precio de lista">
          <MoneyAmount valor={precioLista} sufijo="/mes" />
        </Dato>
        <Dato etiqueta="Mínimo autorizado">
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
        <Dato etiqueta="Diferencia mensual vs. lista">
          <MoneyAmount valor={-impacto.diferenciaMensual} conSigno />
        </Dato>
        <Dato
          etiqueta={`Diferencia en la vigencia (${cotizacion?.plazoMeses ?? "—"} meses)`}
        >
          <MoneyAmount valor={-impacto.diferenciaVigencia} conSigno />
        </Dato>
      </dl>

      <div className="mt-4 rounded-lg bg-brand-cream p-3">
        <p className="text-xs text-brand-text-muted">Motivo de Ventas</p>
        <p className="mt-1 text-sm text-brand-text">
          {excepcion.motivo ?? "Sin motivo."}
        </p>
      </div>

      {!pendiente ? (
        <div className="mt-4 rounded-lg border border-brand-line p-3 text-sm">
          <p className="text-brand-text-muted">
            Resuelta por {excepcion.resueltaPor ?? "—"}
          </p>
          {excepcion.comentario ? (
            <p className="mt-1 text-brand-text">{excepcion.comentario}</p>
          ) : null}
        </div>
      ) : puedeResolver ? (
        rechazando ? (
          <form onSubmit={rechazar} className="mt-4 space-y-2">
            <label htmlFor="comentario-rechazo" className="text-sm font-medium">
              Motivo del rechazo (obligatorio)
            </label>
            <Textarea
              id="comentario-rechazo"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Indica a Ventas por qué no procede"
              aria-invalid={error ? true : undefined}
            />
            {error ? (
              <p role="alert" className="text-xs text-brand-danger">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRechazando(false);
                  setError(undefined);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar rechazo
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRechazando(true)}>
              <X /> Rechazar
            </Button>
            <Button onClick={aprobar}>
              <Check /> Aprobar excepción
            </Button>
          </div>
        )
      ) : null}
    </SectionCard>
  );
}
