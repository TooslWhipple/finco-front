"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { MapaLeaflet } from "@/components/mapa/mapa-leaflet";
import { agruparPuntos } from "@/domain";
import type { GrupoMapa } from "@/domain";
import { FONDO_PREVENTA, FONDO_RANGO } from "@/features/panorama/estilo-rango";
import type { PlazaMapa } from "./agregados";

interface MapaPinesProps {
  plazas: readonly PlazaMapa[];
  seleccionadaId: string | null;
  onSeleccionar: (id: string) => void;
}

/** Encuadre del noroeste: de Baja California a Sinaloa. */
const CENTRO: [number, number] = [27.6, -111.3];
const ZOOM_INICIAL = 6;
const ZOOM_MAXIMO_ENCUADRE = 9;
/** Zoom al que se acerca el mapa al elegir una plaza. */
const ZOOM_PLAZA = 12;

function fondoPlaza(p: PlazaMapa): string {
  return p.rango ? FONDO_RANGO[p.rango] : FONDO_PREVENTA;
}

function iconoPin(p: PlazaMapa, seleccionada: boolean) {
  const aro = seleccionada ? "ring-4 ring-brand-cta" : "ring-[3px] ring-white";
  return divIcon({
    className: "bg-transparent",
    iconSize: [0, 0],
    html: `<span class="block ${seleccionada ? "size-6" : "size-5"} -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md ${aro} ${fondoPlaza(p)}"></span>`,
  });
}

function iconoGrupo(cantidad: number) {
  return divIcon({
    className: "bg-transparent",
    iconSize: [0, 0],
    html: `<span class="flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white shadow-md ring-4 ring-white/80">${cantidad}</span>`,
  });
}

/** Agrupa los pines según el zoom actual y los separa al acercar. */
function CapaPines({ plazas, seleccionadaId, onSeleccionar }: MapaPinesProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const grupos = useMemo<GrupoMapa<PlazaMapa>[]>(
    () => agruparPuntos(plazas, zoom),
    [plazas, zoom],
  );

  return (
    <>
      {grupos.map((g) => {
        if (g.puntos.length === 1) {
          const p = g.puntos[0];
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={iconoPin(p, p.id === seleccionadaId)}
              title={p.plaza.nombre}
              eventHandlers={{ click: () => onSeleccionar(p.id) }}
            />
          );
        }
        return (
          <Marker
            key={`${g.id}+${g.puntos.length}`}
            position={[g.lat, g.lng]}
            icon={iconoGrupo(g.puntos.length)}
            title={`${g.puntos.length} plazas`}
            eventHandlers={{
              click: () =>
                map.fitBounds(
                  latLngBounds(g.puntos.map((p) => [p.lat, p.lng] as [number, number])),
                  { padding: [60, 60], maxZoom: ZOOM_PLAZA },
                ),
            }}
          />
        );
      })}
    </>
  );
}

/** Encuadra el mapa sobre las plazas visibles cada vez que cambia el filtro. */
function Encuadrar({ plazas }: { plazas: readonly PlazaMapa[] }) {
  const map = useMap();
  useEffect(() => {
    if (plazas.length === 0) return;
    map.fitBounds(
      plazas.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [70, 70], maxZoom: ZOOM_MAXIMO_ENCUADRE },
    );
  }, [map, plazas]);
  return null;
}

/** Acerca el mapa a la plaza elegida; sin selección no hace nada. */
function EnfocarSeleccion({ destino }: { destino: PlazaMapa | undefined }) {
  const map = useMap();
  const lat = destino?.lat;
  const lng = destino?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    map.setView([lat, lng], Math.max(map.getZoom(), ZOOM_PLAZA));
  }, [map, lat, lng]);
  return null;
}

export default function MapaPines({
  plazas,
  seleccionadaId,
  onSeleccionar,
}: MapaPinesProps) {
  return (
    <MapaLeaflet
      center={CENTRO}
      zoom={ZOOM_INICIAL}
      zoomSnap={0.25}
      scrollWheelZoom={false}
      zoomControl={false}
      className="absolute inset-0 size-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <CapaPines
        plazas={plazas}
        seleccionadaId={seleccionadaId}
        onSeleccionar={onSeleccionar}
      />
      <Encuadrar plazas={plazas} />
      <EnfocarSeleccion destino={plazas.find((p) => p.id === seleccionadaId)} />
    </MapaLeaflet>
  );
}
