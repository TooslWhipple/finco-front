"use client";

import { ArrowLeft, FileX, Printer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { MACHOTE_ARRENDAMIENTO } from "@/data/machote";
import {
  useContratosVivos,
  useLocales,
  useLocatarios,
  usePlazas,
  useProspectos,
  useTodasLasCotizaciones,
} from "@/hooks";
import { cn } from "@/lib/utils";
import { renderContrato } from "./render-contrato";

/** Ruta del documento imprimible de un contrato. */
export function rutaContratoImprimible(folio: string): string {
  return `/contratos/${folio}/imprimir`;
}

/**
 * Contrato redactado desde el machote, en formato carta. Se imprime con
 * `window.print()` (en el iPad: Compartir → Imprimir); el CSS de impresión
 * oculta el shell y los botones.
 */
export function ContratoImprimible({ folio }: { folio: string }) {
  const contratos = useContratosVivos().datos;
  const locales = useLocales().datos;
  const plazas = usePlazas().datos;
  const locatarios = useLocatarios().datos;
  const prospectos = useProspectos().datos;
  const cotizaciones = useTodasLasCotizaciones();

  if (!contratos || !locales || !plazas || !locatarios) {
    return <p className="py-24 text-center text-sm text-brand-text-muted">Cargando…</p>;
  }

  const contrato = contratos.find((c) => (c.folio ?? c.id) === folio);
  const local = locales.find((l) => l.id === contrato?.localId);
  const plaza = plazas.find((p) => p.id === local?.plazaId);
  if (!contrato || !local || !plaza) {
    return (
      <EmptyState
        icono={FileX}
        titulo="No encontramos este contrato"
        descripcion={`El folio ${folio} no existe o fue creado en otra sesión de la demo.`}
        accion={
          <Link href="/contratos" className={buttonVariants({ variant: "default" })}>
            Volver a contratos
          </Link>
        }
        className="py-24"
      />
    );
  }

  const cotizacion = cotizaciones.find((q) => q.id === contrato.cotizacionId);
  const locatario =
    locatarios.find((l) => l.id === contrato.locatarioId)?.nombre ??
    prospectos.find((p) => p.id === contrato.locatarioId)?.nombre ??
    cotizacion?.prospecto.nombre ??
    "Locatario";
  const doc = renderContrato(
    MACHOTE_ARRENDAMIENTO,
    contrato,
    cotizacion,
    local,
    plaza,
    locatario,
  );

  return (
    <div className="mx-auto max-w-[8.5in] space-y-4 print:max-w-none print:space-y-0">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 bg-background/90 px-1 py-2 backdrop-blur print:hidden">
        <Link
          href={`/contratos?contrato=${contrato.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          <ArrowLeft aria-hidden />
          Volver
        </Link>
        <Button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          <Printer aria-hidden />
          Imprimir / guardar PDF
        </Button>
      </div>
      <article
        aria-label={`Contrato ${doc.folio}`}
        className="rounded-xl bg-white px-6 py-8 font-serif text-[15px] leading-relaxed text-black shadow-sm ring-1 ring-brand-line sm:px-12 sm:py-12 print:rounded-none print:p-0 print:text-[11pt] print:shadow-none print:ring-0"
      >
        <header className="mb-8 flex items-start justify-between gap-4 border-b border-black/20 pb-4">
          <Image
            src="/brand/logo.png"
            alt="Finco"
            width={506}
            height={143}
            className="h-auto w-32 shrink-0"
          />
          <p className="text-right font-sans text-sm font-semibold">Folio {doc.folio}</p>
        </header>
        <h1 className="mb-6 text-center font-heading text-lg font-bold uppercase">
          {doc.titulo}
        </h1>
        <p className="mb-6 text-justify">{doc.proemio}</p>
        <div className="space-y-4">
          {doc.clausulas.map((c) => (
            <section key={c.ordinal} className="break-inside-avoid">
              <h2 className="font-bold">
                {c.ordinal}. {c.titulo}.
              </h2>
              <p className="text-justify">{c.texto}</p>
            </section>
          ))}
        </div>
        <div className="mt-16 grid break-inside-avoid grid-cols-2 gap-10 text-center">
          {doc.firmas.map((f) => (
            <div key={f.rol}>
              <div className="border-t border-black pt-2">
                <p className="font-bold">{f.rol}</p>
                <p>{f.nombre}</p>
              </div>
            </div>
          ))}
        </div>
        <footer className="mt-10 border-t border-black/20 pt-3 text-center font-sans text-xs text-black/60">
          Documento generado por el Portal de Plazas · demo
        </footer>
      </article>
    </div>
  );
}
