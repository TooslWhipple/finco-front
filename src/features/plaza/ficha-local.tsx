"use client";

import Link from "next/link";
import { Eye, FileText, Lock } from "lucide-react";
import { Ayuda, GaleriaFotos, SectionCard, StatusChip } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { fotosDeLocal } from "@/data/fotos";
import { ultimoRegistroPrecio, type Local, type Planta, type Rol } from "@/domain";
import { TEXTOS_PRECIO } from "@/features/local/textos-precio";
import { formatFecha, formatMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { describirRegla, type CategoriaLocal } from "./resumen";

interface FichaLocalProps {
  local: Local | undefined;
  planta: Planta | undefined;
  categoria: CategoriaLocal | undefined;
  rol: Rol | null;
  /** Ubicación dentro de la planta ("Frente a estacionamiento"), si se conoce. */
  ubicacion?: string;
  /** Prospectos activos con interés en el local. */
  prospectosActivos: number;
  /** Cotizaciones abiertas del local. */
  cotizacionesAbiertas: number;
  /** Renta del contrato vigente, si el local está ocupado. */
  rentaContratada?: number;
  rutaFicha: string;
  rutaCotizar: string;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 text-sm">
      <dt className="text-brand-text-muted">{etiqueta}</dt>
      <dd className="font-medium text-brand-text">{valor}</dd>
    </div>
  );
}

export function FichaLocal({
  local,
  planta,
  categoria,
  rol,
  ubicacion,
  prospectosActivos: prospectos,
  cotizacionesAbiertas,
  rentaContratada,
  rutaFicha,
  rutaCotizar,
}: FichaLocalProps) {
  if (!local) {
    return (
      <SectionCard titulo="Ficha rápida">
        <p className="text-sm text-brand-text-muted">
          Haz clic en un local del plano para ver su ficha.
        </p>
      </SectionCard>
    );
  }

  const cotizable = local.estatus === "DISPONIBLE" && can(rol, "cotizaciones.crear");
  const ultimoPrecio = ultimoRegistroPrecio(local.historial, "LISTA")?.precio;
  const repreciado = ultimoPrecio !== undefined && ultimoPrecio !== local.precioVigente;
  const resumenProspectos = [
    `${prospectos} activo${prospectos === 1 ? "" : "s"}`,
    `${cotizacionesAbiertas} cotización${cotizacionesAbiertas === 1 ? "" : "es"}`,
  ].join(" · ");

  return (
    <SectionCard
      titulo={
        <span className="flex flex-wrap items-center gap-2">
          Local {local.codigo}
          <StatusChip
            estatus={local.estatus}
            etiqueta={categoria === "CON_ATRASO" ? "Rentado · con atraso" : undefined}
          />
        </span>
      }
    >
      <GaleriaFotos
        variante="portada"
        fotos={fotosDeLocal(local)}
        titulo={`Local ${local.codigo}`}
        className="mb-3"
      />
      <p className="-mt-1 mb-3 text-sm text-brand-text-muted">
        {[planta?.nombre ?? "Planta", ubicacion, `${local.areaM2} m²`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-brand-cream px-4 py-3">
          <Ayuda
            texto={TEXTOS_PRECIO.lista.ayuda}
            className="text-xs text-brand-text-muted"
          >
            {TEXTOS_PRECIO.lista.etiqueta}
          </Ayuda>
          <p className="font-heading text-2xl font-bold text-brand-primary tabular-nums">
            {formatMoneda(local.precioVigente)}
          </p>
          <p className="text-xs text-brand-text-muted">
            {formatMoneda(local.precioVigente / local.areaM2)} / m² · mensual
          </p>
        </div>
        <div className="rounded-lg bg-brand-cta/10 px-4 py-3">
          <Ayuda texto={TEXTOS_PRECIO.minimo.ayuda} className="text-xs text-brand-cta">
            <Lock aria-hidden className="size-3" />
            {TEXTOS_PRECIO.minimo.etiqueta}
          </Ayuda>
          <p className="font-heading text-2xl font-bold text-brand-primary tabular-nums">
            {formatMoneda(local.precioMinimo)}
          </p>
          <p className="text-xs text-brand-text-muted">Lo define la PMO</p>
        </div>
      </div>
      <dl className="mt-4 space-y-1.5">
        {rentaContratada !== undefined ? (
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-brand-text-muted">
              <Ayuda texto={TEXTOS_PRECIO.renta.ayuda}>
                {TEXTOS_PRECIO.renta.etiqueta}
              </Ayuda>
            </dt>
            <dd className="font-medium text-brand-text tabular-nums">
              {formatMoneda(rentaContratada)}
            </dd>
          </div>
        ) : null}
        <Dato etiqueta="Regla anual" valor={describirRegla(local.regla)} />
        {local.libreDesde ? (
          <Dato
            etiqueta="Libre desde"
            valor={`${formatFecha(local.libreDesde)}${repreciado ? " (repreciado)" : ""}`}
          />
        ) : null}
        <Dato etiqueta="Prospectos" valor={resumenProspectos} />
      </dl>
      <div className="mt-4 flex gap-2">
        <Link
          href={rutaFicha}
          className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
        >
          <Eye aria-hidden className="size-4" />
          Ficha del local
        </Link>
        {cotizable ? (
          <Link
            href={rutaCotizar}
            className={cn(
              buttonVariants(),
              "flex-1 bg-brand-cta text-white hover:bg-brand-cta-light",
            )}
          >
            <FileText aria-hidden className="size-4" />
            Cotizar
          </Link>
        ) : null}
      </div>
    </SectionCard>
  );
}
