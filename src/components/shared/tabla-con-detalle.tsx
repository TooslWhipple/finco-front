"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useEsLg } from "@/hooks/pantalla";
import { cn } from "@/lib/utils";

/** Anchos del panel lateral (clases literales para que Tailwind las detecte). */
const ANCHO_PANEL = {
  "24rem": "lg:grid-cols-[minmax(0,1fr)_24rem]",
  "26rem": "lg:grid-cols-[minmax(0,1fr)_26rem]",
} as const;

interface TablaConDetalleProps {
  /** Lista o tabla principal (normalmente una `SectionCard`). */
  lista: ReactNode;
  /** Panel de detalle; `null` cuando no hay selección. */
  detalle: ReactNode;
  /** Ancho del panel lateral desde `lg`. */
  anchoPanel: keyof typeof ANCHO_PANEL;
  /** Cierra el detalle (Esc, toque fuera de la hoja). */
  onCerrar: () => void;
  /** Nombre accesible de la hoja de detalle. */
  etiqueta: string;
}

/**
 * Patrón "tabla + detalle". Desde `lg` (1024 px) el detalle va como panel al lado; por
 * debajo (iPad vertical) se abre como hoja deslizable desde la derecha al tocar una
 * fila, reutilizando `Dialog` (foco atrapado, Esc y toque fuera cierran).
 */
export function TablaConDetalle({
  lista,
  detalle,
  anchoPanel,
  onCerrar,
  etiqueta,
}: TablaConDetalleProps) {
  const esLg = useEsLg();
  const hoja = detalle !== null && !esLg;
  return (
    <>
      <div
        className={cn(
          "grid items-start gap-6",
          detalle !== null && esLg && ANCHO_PANEL[anchoPanel],
        )}
      >
        {lista}
        {detalle !== null && esLg ? detalle : null}
      </div>
      <Dialog
        open={hoja}
        onOpenChange={(abierto) => {
          if (!abierto) onCerrar();
        }}
      >
        <DialogPortal>
          <DialogOverlay data-no-imprimir />
          <DialogPrimitive.Popup
            aria-label={etiqueta}
            data-no-imprimir
            className="fixed inset-y-0 right-0 z-50 flex w-[min(34rem,92vw)] flex-col overflow-y-auto bg-background p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl duration-150 outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          >
            <div className="min-w-0 space-y-6">{hoja ? detalle : null}</div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
