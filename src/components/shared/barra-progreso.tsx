import { cn } from "@/lib/utils";

export type TonoBarra = "verde" | "naranja" | "coral" | "primario";

const FONDO: Record<TonoBarra, string> = {
  verde: "bg-brand-secondary",
  naranja: "bg-brand-cta",
  coral: "bg-brand-coral",
  primario: "bg-brand-primary",
};

interface BarraProgresoProps {
  /** Avance como fracción 0-1. */
  valor: number;
  tono?: TonoBarra;
  /** Fracción 0-1 planeada: se dibuja una marca para ver plan contra real. */
  marcador?: number;
  /** Nombre accesible de la barra. */
  etiqueta: string;
  className?: string;
}

const aPorcentaje = (fraccion: number) => Math.min(100, Math.max(0, fraccion * 100));

/** Barra de progreso con marcador opcional del avance planeado. */
export function BarraProgreso({
  valor,
  tono = "primario",
  marcador,
  etiqueta,
  className,
}: BarraProgresoProps) {
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(aPorcentaje(valor))}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-brand-line",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full", FONDO[tono])}
        style={{ width: `${aPorcentaje(valor)}%` }}
      />
      {marcador !== undefined ? (
        <span
          data-marcador
          className="absolute inset-y-0 w-0.5 bg-brand-text"
          style={{ left: `${aPorcentaje(marcador)}%` }}
        />
      ) : null}
    </div>
  );
}
