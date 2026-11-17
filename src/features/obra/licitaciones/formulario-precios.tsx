"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ETIQUETA_UNIDAD,
  montoDePrecios,
  type Licitacion,
  type PrecioConcepto,
} from "@/domain";
import { formatMoneda, formatNumero } from "@/lib/format";
import {
  capturaDePrecios,
  preciosDeCaptura,
  validarRespuesta,
  type CapturaPrecios,
} from "./esquemas";

interface FormularioPreciosProps {
  licitacion: Licitacion;
  /** Proveedor que responde (el del contratista o el que elige la PMO). */
  proveedorId: string;
  /** Respuesta previa en la ronda abierta, para corregirla. */
  inicial?: readonly PrecioConcepto[];
  etiquetaEnviar: string;
  onEnviar: (precios: PrecioConcepto[]) => void;
  /** Acciones secundarias que van junto al botón de enviar (Volver, Cancelar). */
  secundarias?: ReactNode;
}

/**
 * Captura del precio unitario de cada concepto del catálogo con el total en vivo.
 * La comparten la PMO (a nombre de un proveedor) y el portal del contratista; las
 * reglas son las de `domain/licitacion.ts`.
 */
export function FormularioPrecios({
  licitacion,
  proveedorId,
  inicial,
  etiquetaEnviar,
  onEnviar,
  secundarias,
}: FormularioPreciosProps) {
  const [captura, setCaptura] = useState<CapturaPrecios>(() => capturaDePrecios(inicial));
  const [intentado, setIntentado] = useState(false);
  const errores = validarRespuesta(licitacion, proveedorId, captura);
  const hayErrores =
    errores.general !== undefined || Object.keys(errores.precios).length > 0;
  const precios = preciosDeCaptura(licitacion.conceptos, captura).filter((p) =>
    Number.isFinite(p.precioUnitario),
  );
  const total = montoDePrecios(licitacion.conceptos, precios);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (hayErrores) return;
        onEnviar(preciosDeCaptura(licitacion.conceptos, captura));
      }}
      className="space-y-4"
    >
      <ul className="divide-y divide-brand-line rounded-xl border border-brand-line">
        {licitacion.conceptos.map((concepto) => {
          const id = `precio-${proveedorId}-${concepto.id}`;
          const error = intentado ? errores.precios[concepto.id] : undefined;
          const precio = precios.find((p) => p.conceptoId === concepto.id);
          return (
            <li
              key={concepto.id}
              className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem] sm:items-center"
            >
              <label htmlFor={id} className="min-w-0">
                <span className="block text-xs font-medium text-brand-text-muted">
                  {concepto.clave}
                </span>
                <span className="block text-sm font-medium text-brand-primary">
                  {concepto.descripcion}
                </span>
                <span className="block text-xs text-brand-text-muted tabular-nums">
                  {formatNumero(concepto.volumen)} {ETIQUETA_UNIDAD[concepto.unidad]}
                </span>
              </label>
              <div className="space-y-1">
                <Input
                  id={id}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={`PU por ${ETIQUETA_UNIDAD[concepto.unidad]}`}
                  value={captura[concepto.id] ?? ""}
                  onChange={(e) =>
                    setCaptura((previa) => ({ ...previa, [concepto.id]: e.target.value }))
                  }
                  aria-invalid={error ? true : undefined}
                  className="h-11 text-base md:text-base"
                />
                {error ? (
                  <p role="alert" className="text-xs text-brand-danger">
                    {error}
                  </p>
                ) : null}
              </div>
              <p className="text-right text-sm text-brand-text tabular-nums sm:text-base">
                {precio ? formatMoneda(concepto.volumen * precio.precioUnitario) : "—"}
              </p>
            </li>
          );
        })}
      </ul>
      <p
        aria-live="polite"
        className="flex items-baseline justify-between gap-3 rounded-xl bg-brand-cream px-4 py-3"
      >
        <span className="text-sm font-medium text-brand-text">Total de la propuesta</span>
        <span className="font-heading text-xl font-bold text-brand-primary tabular-nums">
          {formatMoneda(total)}
        </span>
      </p>
      {intentado && errores.general ? (
        <p role="alert" className="text-sm text-brand-danger">
          {errores.general}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {secundarias}
        <Button
          type="submit"
          className="h-11 bg-brand-cta px-5 text-white hover:bg-brand-cta-light"
        >
          {etiquetaEnviar}
        </Button>
      </div>
    </form>
  );
}
