"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ImageOff, Lock, Ruler, Store } from "lucide-react";
import {
  EmptyState,
  KpiCard,
  KpiRow,
  MoneyAmount,
  PageHeader,
  SectionCard,
  SelectorPill,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { can, veTodoElEquipo } from "@/config/permissions";
import { fotosDeLocal } from "@/data/fotos";
import { PLAZA_HEROE_ID } from "@/data/heroe";
import type { Local } from "@/domain";
import { useCotizaciones, useLocales, usePlazas, useSesion } from "@/hooks";
import { formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  kpisDisponibilidad,
  localesDisponibles,
  plazaInicial,
  plazasConDisponibles,
  rutaCotizar,
} from "./agregados";

/** Inicio del vendedor: qué hay disponible por plaza, a qué precio, y desde ahí cotiza. */
export function Disponibilidad() {
  const { rol } = useSesion();
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const cotizaciones = useCotizaciones();
  const [elegida, setElegida] = useState<string>();

  const opciones = useMemo(
    () => (plazas && locales ? plazasConDisponibles(plazas, locales) : []),
    [plazas, locales],
  );
  const plazaId = elegida ?? plazaInicial(opciones, PLAZA_HEROE_ID);
  const tarjetas = useMemo(
    () => localesDisponibles((locales ?? []).filter((l) => l.plazaId === plazaId)),
    [locales, plazaId],
  );
  const fotosPrimeraFila = useMemo(() => fotosSobreElPliegue(tarjetas), [tarjetas]);
  const kpis = kpisDisponibilidad(opciones, cotizaciones);
  const equipo = rol ? veTodoElEquipo(rol) : false;
  const puedeCotizar = can(rol, "cotizaciones.crear");

  if (!plazas || !locales) {
    return <p className="text-sm text-brand-text-muted">Cargando…</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Disponibilidad"
        descripcion="Locales libres por plaza con su precio de lista vigente. Elige uno para cotizar."
        acciones={
          <SelectorPill
            etiqueta="Plaza"
            valor={plazaId}
            opciones={opciones.map((o) => ({
              valor: o.plazaId,
              etiqueta: `${o.nombre} (${o.disponibles})`,
            }))}
            onChange={setElegida}
            className="[&_select]:h-11 [&_select]:text-base"
          />
        }
      />

      <KpiRow>
        <KpiCard
          etiqueta="Locales disponibles"
          valor={formatNumero(kpis.localesDisponibles)}
        />
        <KpiCard
          etiqueta="Plazas con disponibles"
          valor={formatNumero(kpis.plazasConDisponibles)}
        />
        <KpiCard
          etiqueta={
            equipo ? "Cotizaciones abiertas del equipo" : "Mis cotizaciones abiertas"
          }
          valor={formatNumero(kpis.cotizacionesAbiertas)}
        />
      </KpiRow>

      {tarjetas.length === 0 ? (
        <SectionCard>
          <EmptyState
            icono={Store}
            titulo="Sin locales disponibles"
            descripcion="Esta plaza no tiene locales libres por ahora."
          />
        </SectionCard>
      ) : (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {tarjetas.map((local) => (
            <li key={local.id} className="min-w-0">
              <TarjetaLocal
                local={local}
                puedeCotizar={puedeCotizar}
                prioritaria={fotosPrimeraFila.has(fotosDeLocal(local)[0]?.src ?? "")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tarjetas de la primera fila (3 columnas desde `lg`): su foto es candidata a LCP. */
const FOTOS_PRIMERA_FILA = 3;

/**
 * Fotos de la primera fila. Next identifica cada imagen por su URL y el catálogo
 * repite fotos entre locales: si una tarjeta de más abajo trae la misma foto sin
 * `eager`, el aviso de LCP salta aunque la de arriba la tenga. Cargarla sin
 * diferir en todas las que la repiten no cuesta nada: es el mismo archivo.
 */
function fotosSobreElPliegue(tarjetas: readonly Local[]): ReadonlySet<string> {
  return new Set(
    tarjetas
      .slice(0, FOTOS_PRIMERA_FILA)
      .flatMap((local) => fotosDeLocal(local)[0]?.src ?? []),
  );
}

function TarjetaLocal({
  local,
  puedeCotizar,
  prioritaria,
}: {
  local: Local;
  puedeCotizar: boolean;
  /** Carga la foto sin diferirla (es una foto de la primera fila). */
  prioritaria: boolean;
}) {
  const foto = fotosDeLocal(local)[0];
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-line bg-card shadow-xs">
      <div className="relative aspect-[3/2] w-full bg-brand-cream">
        {foto ? (
          <Image
            src={foto.src}
            alt={foto.alt}
            width={foto.ancho}
            height={foto.alto}
            sizes="(min-width: 1024px) 20rem, 50vw"
            loading={prioritaria ? "eager" : undefined}
            className="size-full object-cover"
          />
        ) : (
          <ImageOff
            aria-hidden
            className="absolute inset-0 m-auto size-6 text-brand-text-muted"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-bold text-brand-text">
            {local.codigo}
          </h2>
          <span className="flex items-center gap-1 text-sm whitespace-nowrap text-brand-text-muted">
            <Ruler aria-hidden className="size-3.5" />
            {formatNumero(local.areaM2)} m²
          </span>
        </div>
        <p className="min-h-5 truncate text-sm text-brand-text-muted">
          {local.giro ? `Giro sugerido: ${local.giro}` : "Giro libre"}
        </p>
        <p className="mt-1 font-heading text-xl font-bold text-brand-primary">
          <MoneyAmount valor={local.precioVigente} sufijo=" / mes" />
        </p>
        {puedeCotizar ? (
          <Link
            href={rutaCotizar(local.id)}
            className={cn(
              buttonVariants(),
              "mt-3 h-11 w-full bg-brand-cta text-base text-white hover:bg-brand-cta-light",
            )}
          >
            Cotizar
          </Link>
        ) : (
          <p className="mt-3 flex h-11 items-center gap-1.5 text-sm text-brand-text-muted">
            <Lock aria-hidden className="size-4" />
            Tu rol no cotiza
          </p>
        )}
      </div>
    </article>
  );
}
