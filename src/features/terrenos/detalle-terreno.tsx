"use client";

import Link from "next/link";
import { useState } from "react";
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
import { HitosTerreno } from "./hitos-terreno";
import { UbicacionTerreno } from "./ubicacion-terreno";

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
            contenido: <HitosTerreno hitos={t.hitos} />,
          },
          {
            titulo: "Ubicación",
            contenido: <UbicacionTerreno nombre={t.nombre} posicion={posicion} />,
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
                {/* Con contratos de obra el avance se deriva de los cortes validados. */}
                {t.semaforoObra ? null : (
                  <Button variant="outline" onClick={() => setEditandoAvance(true)}>
                    Actualizar avance
                  </Button>
                )}
              </>
            ) : null}
            <Link
              href={`/terrenos-y-proyectos/${t.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Ver expediente
            </Link>
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
