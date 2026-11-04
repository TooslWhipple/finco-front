"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { PageHeader, SelectorPill } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { useExcepciones, useLocales, usePlazas, useSesion } from "@/hooks";
import { PestanaExcepciones } from "@/features/aprobaciones/pestana-excepciones";
import { BandejaActualizacionAnual } from "@/features/local/bandeja-actualizacion-anual";
import { PrecioReglaLocal } from "@/features/local/precio-regla-local";
import { cn } from "@/lib/utils";

/** Local con el que abre la pantalla: el A-09 de la plaza héroe, como en la guía. */
const LOCAL_POR_DEFECTO = "plz-alborada-A-09";

/**
 * "Precios y reglas": la ficha de precio y regla del local elegido (izquierda) junto a
 * la bandeja de aprobación anual (derecha), y las excepciones de precio debajo.
 * El local elegido vive en la URL (`?local=`).
 */
export function PreciosYReglas() {
  const ruta = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { rol } = useSesion();
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const excepcionesPend = useExcepciones().filter((e) => e.estado === "PENDIENTE").length;

  const idPedido = params.get("local") ?? LOCAL_POR_DEFECTO;
  const local = useMemo(
    () =>
      locales?.find((l) => l.id === idPedido) ??
      locales?.find((l) => l.id === LOCAL_POR_DEFECTO),
    [locales, idPedido],
  );
  const plaza = plazas?.find((p) => p.id === local?.plazaId);
  const localesPlaza = useMemo(
    () => locales?.filter((l) => l.plazaId === local?.plazaId) ?? [],
    [locales, local?.plazaId],
  );

  if (!local || !plaza || !plazas) {
    return <p className="text-sm text-brand-text-muted">Cargando…</p>;
  }

  function elegirLocal(id: string) {
    router.push(`${ruta}?local=${encodeURIComponent(id)}`, { scroll: false });
  }

  function elegirPlaza(plazaId: string) {
    const primero = locales?.find((l) => l.plazaId === plazaId);
    if (primero) elegirLocal(primero.id);
  }

  const soloLectura = !can(rol, "excepcion.resolver");

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Precios y reglas"
        descripcion="Precio mínimo, regla de actualización y aprobación de cambios por local."
        acciones={
          <>
            <SelectorPill
              etiqueta="Plaza"
              valor={plaza.id}
              opciones={plazas.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
              onChange={elegirPlaza}
            />
            <SelectorPill
              etiqueta="Local"
              valor={local.id}
              opciones={localesPlaza.map((l) => ({
                valor: l.id,
                etiqueta: `Local ${l.codigo}`,
              }))}
              onChange={elegirLocal}
            />
            <Link
              href={`/plazas/${plaza.id}/locales/${local.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ExternalLink aria-hidden className="size-4" />
              Ver ficha del local
            </Link>
          </>
        }
      />
      {soloLectura ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Solo Superadmin puede aprobar o rechazar cambios y
          excepciones, y editar el precio mínimo y la regla.
        </p>
      ) : null}

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <PrecioReglaLocal key={local.id} local={local} plaza={plaza} />
        <div className="min-w-0">
          <BandejaActualizacionAnual localIdDestacado={local.id} />
        </div>
      </div>

      <section aria-labelledby="titulo-excepciones" className="space-y-3">
        <h2
          id="titulo-excepciones"
          className="font-heading text-lg font-bold text-brand-primary"
        >
          Excepciones de precio ({excepcionesPend})
        </h2>
        <PestanaExcepciones />
      </section>
    </div>
  );
}
