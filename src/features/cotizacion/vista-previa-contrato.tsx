import { FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MACHOTE_ARRENDAMIENTO } from "@/data/machote";
import { contratoDesdeCotizacion } from "@/domain";
import type { Ciudad, Cotizacion, Local, Plaza } from "@/domain";
import { rutaContratoImprimible } from "@/features/contratos/contrato-imprimible";
import { renderContrato } from "@/features/contratos/render-contrato";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VistaPreviaContratoProps {
  cotizacion: Cotizacion;
  local: Local;
  plaza: Plaza;
  ciudad?: Ciudad;
  folioContrato: string;
  /** Con el contrato ya generado, se ofrece abrir el documento imprimible. */
  contratoGenerado?: boolean;
}

/** Hoja del contrato siempre visible, redactada con el machote y los datos de la cotización. */
export function VistaPreviaContrato({
  cotizacion,
  local,
  plaza,
  ciudad,
  folioContrato,
  contratoGenerado = false,
}: VistaPreviaContratoProps) {
  const doc = renderContrato(
    MACHOTE_ARRENDAMIENTO,
    contratoDesdeCotizacion(cotizacion),
    cotizacion,
    local,
    plaza,
    cotizacion.prospecto.nombre,
  );
  return (
    <aside
      aria-label="Vista previa del contrato"
      className="flex h-full flex-col rounded-2xl bg-brand-primary/5 p-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <h2 className="font-medium text-brand-text">Vista previa del contrato</h2>
        <span className="text-xs text-brand-text-muted">
          Plantilla: Arrendamiento comercial v3
        </span>
      </div>
      <article className="flex flex-1 flex-col gap-5 rounded-xl bg-card p-5 shadow-sm">
        <header className="flex items-start justify-between gap-3">
          <Image
            src="/brand/logo.png"
            alt="Finco"
            width={506}
            height={143}
            className="h-auto w-24 shrink-0"
          />
          <span className="min-w-0 truncate rounded-full bg-brand-cta/15 px-2.5 py-0.5 text-xs font-medium text-brand-cta">
            Borrador · {folioContrato}
          </span>
        </header>
        <div className="space-y-1 text-center">
          <h3 className="font-heading text-base leading-snug font-bold text-brand-text uppercase">
            Contrato de arrendamiento de local comercial
          </h3>
          <p className="text-xs text-brand-text-muted">
            {plaza.nombre}, Local {local.codigo}
            {ciudad ? ` · ${ciudad.nombre}, ${ciudad.estado}` : ""}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-brand-text">{doc.proemio}</p>
        {doc.clausulas.map((c) => (
          <section key={c.ordinal} className="space-y-1">
            <h3 className="text-xs font-bold tracking-wide text-brand-text uppercase">
              {c.ordinal}. {c.titulo}
            </h3>
            <p className="text-xs leading-relaxed text-brand-text">{c.texto}</p>
          </section>
        ))}
        {contratoGenerado ? (
          <Link
            href={rutaContratoImprimible(folioContrato)}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}
          >
            <FileText aria-hidden />
            Ver contrato
          </Link>
        ) : null}
        <section
          aria-label="Anexo A"
          className="mt-auto flex items-start gap-3 rounded-lg border border-dashed border-brand-secondary bg-brand-secondary/10 p-3"
        >
          <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <div>
            <p className="text-sm font-semibold text-brand-text">
              Anexo A · Cotización oficial {cotizacion.id}
            </p>
            <p className="text-xs text-brand-text-muted">
              Se adjunta en automático · no editable
            </p>
          </div>
        </section>
      </article>
    </aside>
  );
}
