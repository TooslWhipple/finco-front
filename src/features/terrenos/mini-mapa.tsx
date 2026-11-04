"use client";

import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";
import { Marker, TileLayer } from "react-leaflet";
import { MapaLeaflet } from "@/components/mapa/mapa-leaflet";
import type { Coordenadas } from "@/domain";

const ZOOM = 12;

const ICONO = divIcon({
  className: "bg-transparent",
  iconSize: [0, 0],
  html: '<span class="block size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-indigo shadow-md ring-4 ring-white"></span>',
});

/** Mapa fijo con el pin de un terreno; sin interacción, solo ubica. */
export default function MiniMapa({ posicion }: { posicion: Coordenadas }) {
  const centro: [number, number] = [posicion.lat, posicion.lng];
  return (
    <MapaLeaflet
      key={`${posicion.lat},${posicion.lng}`}
      center={centro}
      zoom={ZOOM}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      keyboard={false}
      className="absolute inset-0 size-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={centro} icon={ICONO} interactive={false} />
    </MapaLeaflet>
  );
}
