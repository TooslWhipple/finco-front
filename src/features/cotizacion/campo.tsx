import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CampoProps {
  etiqueta: string;
  htmlFor: string;
  error?: string;
  ayuda?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Etiqueta + control + ayuda/error de un campo de formulario. */
export function Campo({
  etiqueta,
  htmlFor,
  error,
  ayuda,
  children,
  className,
}: CampoProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-brand-text">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-brand-danger">
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-xs text-brand-text-muted">{ayuda}</p>
      ) : null}
    </div>
  );
}

/** Clases de un `<select>` nativo con el aspecto de `Input`. */
export const CLASE_SELECT =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

const CLASE_CAJA =
  "flex min-h-10 items-center gap-2 rounded-xl border bg-card px-3 py-1.5 text-sm text-brand-text";

/** Caja con borde fino que aloja un `Input` sin borde y adornos de texto a los lados. */
export function EntradaConAdornos({
  prefijo,
  sufijo,
  invalido,
  children,
}: {
  prefijo?: ReactNode;
  sufijo?: ReactNode;
  invalido?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        CLASE_CAJA,
        "focus-within:ring-3 focus-within:ring-ring/50",
        invalido
          ? "border-brand-coral ring-3 ring-brand-coral/15"
          : "border-brand-line focus-within:border-ring",
      )}
    >
      {prefijo ? <span aria-hidden>{prefijo}</span> : null}
      {children}
      {sufijo ? <span className="shrink-0 text-brand-text-muted">{sufijo}</span> : null}
    </div>
  );
}

/** Clases del `Input` que vive dentro de `EntradaConAdornos`. */
export const CLASE_INPUT_EN_CAJA =
  "h-full min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 dark:bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Dato de solo lectura con el aspecto de un campo; `bloqueado` añade el candado. */
export function CampoLectura({
  etiqueta,
  valor,
  complemento,
  bloqueado,
}: {
  etiqueta: string;
  valor: ReactNode;
  /** Texto atenuado a continuación del valor. */
  complemento?: ReactNode;
  bloqueado?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-brand-text-muted">{etiqueta}</p>
      <div className={cn(CLASE_CAJA, "border-brand-line")}>
        <span className="min-w-0 flex-1 break-words">
          {valor}
          {complemento ? (
            <span className="text-brand-text-muted"> · {complemento}</span>
          ) : null}
        </span>
        {bloqueado ? (
          <Lock
            aria-label="Bloqueado"
            className="size-3.5 shrink-0 text-brand-text-muted"
          />
        ) : null}
      </div>
    </div>
  );
}
