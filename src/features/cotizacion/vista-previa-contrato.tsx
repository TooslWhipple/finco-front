import { FileText } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Ciudad, Cotizacion, Local, Plaza } from "@/domain";
import { describirIncremento } from "@/features/plaza/resumen";

interface VistaPreviaContratoProps {
  cotizacion: Cotizacion;
  local: Local;
  plaza: Plaza;
  ciudad?: Ciudad;
  folioContrato: string;
}

/** Barras grises que representan texto aún no redactado. */
function Lineas({ anchos }: { anchos: readonly string[] }) {
  return (
    <div aria-hidden className="space-y-2">
      {anchos.map((ancho, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full bg-brand-line"
          style={{ width: ancho }}
        />
      ))}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-bold tracking-wide text-brand-text uppercase">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

/** Hoja del contrato siempre visible; la cláusula de renta se redacta con los datos y el resto es maqueta. */
export function VistaPreviaContrato({
  cotizacion,
  local,
  plaza,
  ciudad,
  folioContrato,
}: VistaPreviaContratoProps) {
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
        <Seccion titulo="Declaraciones">
          <Lineas anchos={["100%", "96%", "86%", "92%", "70%"]} />
        </Seccion>
        <Seccion titulo="Primera. Objeto">
          <Lineas anchos={["100%", "90%", "62%"]} />
        </Seccion>
        <Seccion titulo="Segunda. Renta y actualización">
          <p className="text-xs leading-relaxed text-brand-text">
            La renta mensual será la indicada en el <strong>Anexo A</strong>, actualizada
            cada año conforme a la regla{" "}
            <strong>{describirIncremento(cotizacion.reglaPactada)}</strong>, con
            facturación el día 1 de cada mes...
          </p>
          <Lineas anchos={["88%", "60%"]} />
        </Seccion>
        <Seccion titulo="Tercera. Vigencia">
          <Lineas anchos={["100%", "58%"]} />
        </Seccion>
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
