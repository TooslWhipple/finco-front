"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { PanelDetalle, StatusChip } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  avanceEsperado,
  idPlazaDeTerreno,
  semaforoTerreno,
  type Ciudad,
  type Coordenadas,
  type EtapaTerreno,
  type Terreno,
} from "@/domain";
import { formatFecha, formatNumero } from "@/lib/format";
import { DialogoActualizarAvance, DialogoMoverEtapa } from "./dialogos-terreno";

const MiniMapa = dynamic(() => import("./mini-mapa"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-text-muted">
      Cargando mapa…
    </div>
  ),
});

interface DetalleTerrenoProps {
  terreno: Terreno;
  hoy: string;
  ciudad?: Ciudad;
  posicion?: Coordenadas;
  puedeGestionar: boolean;
  onMover: (id: string, etapa: EtapaTerreno) => void;
  onActualizarAvance: (id: string, avancePct: number) => void;
  onCerrar: () => void;
  className?: string;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-text-muted">{etiqueta}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  );
}

/** Panel lateral del proyecto: datos, hitos, mini-mapa y acciones de gestión. */
export function DetalleTerreno({
  terreno: t,
  hoy,
  ciudad,
  posicion,
  puedeGestionar,
  onMover,
  onActualizarAvance,
  onCerrar,
  className,
}: DetalleTerrenoProps) {
  const [moviendo, setMoviendo] = useState(false);
  const [editandoAvance, setEditandoAvance] = useState(false);
  const semaforo = semaforoTerreno(t, hoy);

  return (
    <>
      <PanelDetalle
        className={className}
        titulo={t.nombre}
        subtitulo={ciudad ? `${ciudad.nombre}, ${ciudad.estado}` : undefined}
        estado={
          <span className="flex flex-wrap gap-2">
            <StatusChip estatus={t.etapa} />
            <StatusChip estatus={semaforo} />
          </span>
        }
        onCerrar={onCerrar}
        secciones={[
          {
            titulo: "Proyecto",
            contenido: (
              <dl className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Responsable" valor={t.responsable} />
                <Dato etiqueta="Fecha objetivo" valor={formatFecha(t.fechaObjetivo)} />
                <Dato
                  etiqueta="Avance de la etapa"
                  valor={`${t.avancePct}% (esperado ${Math.round(avanceEsperado(t, hoy))}%)`}
                />
                <Dato etiqueta="Inicio" valor={formatFecha(t.inicioDesarrollo)} />
                <Dato etiqueta="Predio" valor={`${formatNumero(t.areaM2)} m²`} />
                <Dato
                  etiqueta="Locales proyectados"
                  valor={formatNumero(t.localesProyectados)}
                />
              </dl>
            ),
          },
          {
            titulo: "Hitos",
            contenido: (
              <ol className="space-y-2">
                {t.hitos.map((h) => (
                  <li key={h.id} className="flex items-start gap-2">
                    {h.cumplido ? (
                      <CheckCircle2
                        aria-label="Cumplido"
                        className="mt-0.5 size-4 shrink-0 text-brand-secondary"
                      />
                    ) : (
                      <Circle
                        aria-label="Pendiente"
                        className="mt-0.5 size-4 shrink-0 text-brand-text-muted"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block">{h.titulo}</span>
                      <span className="block text-xs text-brand-text-muted">
                        {formatFecha(h.fecha)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ),
          },
          {
            titulo: "Ubicación",
            contenido: posicion ? (
              <div
                role="img"
                aria-label={`Ubicación de ${t.nombre}`}
                className="relative h-44 overflow-hidden rounded-lg border border-brand-line"
              >
                <MiniMapa posicion={posicion} />
              </div>
            ) : (
              "Sin ubicación."
            ),
          },
        ]}
        acciones={
          <>
            {puedeGestionar ? (
              <>
                <Button
                  onClick={() => setMoviendo(true)}
                  className="bg-brand-cta text-white hover:bg-brand-cta-light"
                >
                  Mover a etapa
                </Button>
                <Button variant="outline" onClick={() => setEditandoAvance(true)}>
                  Actualizar avance
                </Button>
              </>
            ) : null}
            {t.plazaId ? (
              <Link
                href={`/plazas/${t.plazaId}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Ver plaza
              </Link>
            ) : t.etapa === "PREVENTA" ? (
              <Link
                href={`/mapa-de-plazas?plaza=${idPlazaDeTerreno(t.id)}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Ver en mapa
              </Link>
            ) : null}
          </>
        }
      />
      {moviendo ? (
        <DialogoMoverEtapa
          terreno={t}
          abierto
          onCambioAbierto={setMoviendo}
          onMover={onMover}
        />
      ) : null}
      {editandoAvance ? (
        <DialogoActualizarAvance
          terreno={t}
          abierto
          onCambioAbierto={setEditandoAvance}
          onActualizar={onActualizarAvance}
        />
      ) : null}
    </>
  );
}
