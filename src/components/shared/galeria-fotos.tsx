"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Foto } from "@/domain";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export interface GaleriaFotosProps {
  fotos: Foto[];
  variante?: "completa" | "portada";
  /** Título del visor. */
  titulo?: string;
  className?: string;
}

export function GaleriaFotos({
  fotos,
  variante = "completa",
  titulo = "Fotos",
  className,
}: GaleriaFotosProps) {
  const [indice, setIndice] = useState(0);
  const [visorAbierto, setVisorAbierto] = useState(false);

  const total = fotos.length;
  const actual = total > 0 ? Math.min(indice, total - 1) : 0;

  if (total === 0) {
    return (
      <EmptyState icono={ImageOff} titulo="Sin fotos" className={cn("py-6", className)} />
    );
  }

  const foto = fotos[actual];
  const abrir = (i: number) => {
    setIndice(i);
    setVisorAbierto(true);
  };
  const anterior = () => setIndice((i) => (i - 1 + total) % total);
  const siguiente = () => setIndice((i) => (i + 1) % total);
  // Flechas del teclado dentro del visor. El Dialog de base-ui atrapa el foco en
  // su popup y no deja llegar el keydown a window, así que se escucha en el
  // propio popup. Esc lo gestiona base-ui: dentro de otro Dialog cierra solo el
  // más reciente.
  const alTeclear = (e: KeyboardEvent) => {
    if (total < 2) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      anterior();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      siguiente();
    }
  };

  const indiceDestacada = variante === "portada" ? 0 : actual;
  const destacada = fotos[indiceDestacada];

  const principal = (
    <button
      type="button"
      onClick={() => abrir(indiceDestacada)}
      aria-label={`Ampliar foto: ${destacada.alt}`}
      className="group relative block aspect-[3/2] w-full overflow-hidden rounded-lg bg-brand-cream focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
    >
      <Image
        src={destacada.src}
        alt={destacada.alt}
        width={destacada.ancho}
        height={destacada.alto}
        sizes={
          variante === "portada"
            ? "(min-width: 1280px) 24rem, 100vw"
            : "(min-width: 1280px) 40rem, 100vw"
        }
        className="size-full object-cover transition-transform group-hover:scale-[1.02]"
      />
      {variante === "portada" ? (
        <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
          1/{total}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className={cn("space-y-2", className)}>
      {principal}
      {variante === "completa" && total > 1 ? (
        <ul className="grid grid-cols-4 gap-2">
          {fotos.map((f, i) => (
            <li key={f.src}>
              <button
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver foto ${i + 1} de ${total}`}
                aria-current={i === actual}
                className={cn(
                  "relative block aspect-[3/2] w-full overflow-hidden rounded-md ring-2 ring-transparent transition focus-visible:outline-none",
                  i === actual
                    ? "ring-brand-primary"
                    : "opacity-70 hover:opacity-100 focus-visible:ring-brand-primary",
                )}
              >
                <Image
                  src={f.src}
                  alt={f.alt}
                  width={f.ancho}
                  height={f.alto}
                  sizes="10rem"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={visorAbierto} onOpenChange={setVisorAbierto}>
        <DialogContent className="sm:max-w-3xl" onKeyDown={alTeclear}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription className="tabular-nums">
              {actual + 1}/{total} · {foto.alt}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-brand-cream">
            <Image
              src={foto.src}
              alt={foto.alt}
              width={foto.ancho}
              height={foto.alto}
              sizes="(min-width: 768px) 48rem, 100vw"
              className="size-full object-cover"
            />
            {total > 1 ? (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={anterior}
                  aria-label="Foto anterior"
                  className="absolute top-1/2 left-2 -translate-y-1/2"
                >
                  <ChevronLeft aria-hidden />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={siguiente}
                  aria-label="Foto siguiente"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <ChevronRight aria-hidden />
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
