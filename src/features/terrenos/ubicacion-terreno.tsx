"use client";

import dynamic from "next/dynamic";
import type { Coordenadas } from "@/domain";

const MiniMapa = dynamic(() => import("./mini-mapa"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-text-muted">
      Cargando mapa…
    </div>
  ),
});

interface UbicacionTerrenoProps {
  nombre: string;
  posicion?: Coordenadas;
}

/** Mini-mapa con el pin del terreno (panel lateral y pestaña Resumen del expediente). */
export function UbicacionTerreno({ nombre, posicion }: UbicacionTerrenoProps) {
  if (!posicion) return <>Sin ubicación.</>;
  return (
    <div
      role="img"
      aria-label={`Ubicación de ${nombre}`}
      className="relative h-44 overflow-hidden rounded-lg border border-brand-line"
    >
      <MiniMapa posicion={posicion} />
    </div>
  );
}
