import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  titulo?: ReactNode;
  /** Texto o enlace a la derecha del título. */
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Quita el padding del cuerpo (tablas, mapas a sangre). */
  sinPadding?: boolean;
}

export function SectionCard({
  titulo,
  extra,
  children,
  className,
  sinPadding,
}: SectionCardProps) {
  return (
    <section
      className={cn("rounded-xl border border-brand-line bg-card shadow-xs", className)}
    >
      {titulo || extra ? (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="font-heading text-base font-semibold text-brand-primary">
            {titulo}
          </h2>
          {extra ? <div className="text-sm text-brand-text-muted">{extra}</div> : null}
        </div>
      ) : null}
      <div className={cn(sinPadding ? "" : "p-5", titulo || extra ? "pt-3" : "")}>
        {children}
      </div>
    </section>
  );
}
