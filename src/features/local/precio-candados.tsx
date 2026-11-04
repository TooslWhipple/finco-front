"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { DEMO_TODAY, type Local } from "@/domain";
import { formatFecha, formatMoneda, formatPorcentaje } from "@/lib/format";
import type { EntradaBitacora } from "@/store/reducers";
import { fechaUltimaEdicionMinimo, margenSobreMinimo, validarMinimo } from "./calculos";

interface PrecioCandadosProps {
  local: Local;
  /** Solo el Superadmin edita el mínimo. */
  puedeEditar: boolean;
  autor: string;
  bitacora: readonly EntradaBitacora[];
  onGuardar: (precioMinimo: number, bitacora: EntradaBitacora[]) => void;
  /** Contenido bajo las cifras (la regla de actualización). */
  children?: ReactNode;
}

function Cifra({
  etiqueta,
  valor,
  nota,
  icono,
  className,
}: {
  etiqueta: string;
  valor: string;
  nota: string;
  icono?: boolean;
  className: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${className}`}>
      <p className="flex items-center gap-1.5 text-sm text-brand-text-muted">
        {icono ? <Lock aria-hidden className="size-3.5 text-brand-cta" /> : null}
        <span className={icono ? "font-medium text-brand-cta" : undefined}>
          {etiqueta}
        </span>
      </p>
      <p className="mt-1 font-heading text-3xl font-bold text-brand-primary tabular-nums">
        {valor}
      </p>
      <p
        className={`mt-0.5 text-xs ${icono ? "text-brand-cta" : "text-brand-text-muted"}`}
      >
        {nota}
      </p>
    </div>
  );
}

export function PrecioCandados({
  local,
  puedeEditar,
  autor,
  bitacora,
  onGuardar,
  children,
}: PrecioCandadosProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);

  const margen = margenSobreMinimo(local);
  const fechaMinimo = fechaUltimaEdicionMinimo(bitacora);
  const valor = Number(texto);
  const errorMonto = validarMinimo(valor, local.precioVigente);
  const errorMotivo = motivo.trim() ? null : "Indica el motivo del cambio.";

  function abrir() {
    setTexto(String(local.precioMinimo));
    setMotivo("");
    setIntentado(false);
    setAbierto(true);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (errorMonto || errorMotivo) return;
    onGuardar(valor, [
      ...bitacora,
      {
        fecha: DEMO_TODAY,
        autor,
        titulo: `Mínimo autorizado: ${formatMoneda(local.precioMinimo)} → ${formatMoneda(valor)}`,
        detalle: motivo.trim(),
      },
    ]);
    setAbierto(false);
    toast.success(`Mínimo del local ${local.codigo} actualizado`);
  }

  return (
    <SectionCard
      titulo="Precio y candados"
      extra={
        <span className="flex items-center gap-3">
          {puedeEditar ? (
            <Button variant="outline" size="sm" onClick={abrir}>
              <Pencil aria-hidden />
              Editar mínimo
            </Button>
          ) : null}
          lista de precios por local
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Cifra
          etiqueta="Precio de lista vigente"
          valor={formatMoneda(local.precioVigente)}
          nota={`mensual + IVA · ${formatMoneda(local.precioVigente / local.areaM2)} / m²`}
          className="border-brand-line bg-card"
        />
        <Cifra
          etiqueta="Precio mínimo autorizado"
          valor={formatMoneda(local.precioMinimo)}
          nota={
            fechaMinimo
              ? `Solo superadmin · modif. ${formatFecha(fechaMinimo)}`
              : "Solo superadmin · sin modificaciones"
          }
          icono
          className="border-brand-cta/40 bg-brand-cta/10"
        />
        <Cifra
          etiqueta="Margen de negociación"
          valor={formatMoneda(margen.monto)}
          nota={`${formatPorcentaje(margen.fraccionSobreLista)} sobre lista · ventas no baja de aquí`}
          className="border-brand-line bg-card"
        />
      </div>
      {children ? <div className="mt-5">{children}</div> : null}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <form onSubmit={enviar} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Editar mínimo autorizado</DialogTitle>
              <DialogDescription>
                Local {local.codigo} · precio de lista {formatMoneda(local.precioVigente)}
                . El cambio queda registrado en el historial.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <label htmlFor="nuevo-minimo" className="text-sm font-medium">
                Nuevo mínimo (MXN / mes)
              </label>
              <Input
                id="nuevo-minimo"
                inputMode="numeric"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                aria-invalid={intentado && errorMonto ? true : undefined}
              />
              {intentado && errorMonto ? (
                <p role="alert" className="text-xs text-brand-danger">
                  {errorMonto}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="motivo-minimo" className="text-sm font-medium">
                Motivo
              </label>
              <Textarea
                id="motivo-minimo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                aria-invalid={intentado && errorMotivo ? true : undefined}
              />
              {intentado && errorMotivo ? (
                <p role="alert" className="text-xs text-brand-danger">
                  {errorMotivo}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar mínimo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
