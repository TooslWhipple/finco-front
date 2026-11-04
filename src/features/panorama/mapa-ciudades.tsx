"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { divIcon } from "leaflet";
import {
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { MapaLeaflet } from "@/components/mapa/mapa-leaflet";
import { rutaPlaza } from "@/domain";
import { formatNumero, formatPorcentaje } from "@/lib/format";
import { bordeCiudad, fondoCiudad } from "./estilo-rango";
import type { ResumenCiudad } from "./agregados";

interface MapaCiudadesProps {
  ciudades: ResumenCiudad[];
}

/** Encuadre del noroeste: de Baja California a Sinaloa. */
const CENTRO: [number, number] = [27.6, -111.3];
const ZOOM = 6;

const ALTO_ETIQUETA = 30;
const SEPARACION_ETIQUETA = 4;
const HOLGURA_PIN = 14;
const RADIO_PIN = 12;

function textoEtiqueta(c: ResumenCiudad): { nombre: string; detalle: string } {
  return {
    nombre: c.ciudad.nombre,
    detalle: `${c.totalPlazas} ${c.totalPlazas === 1 ? "plaza" : "plazas"} · ${c.totalLocales} loc.`,
  };
}

/** Ancho aproximado de la etiqueta, para colocarla sin encimarla con otra. */
function anchoEtiqueta(c: ResumenCiudad): number {
  const { nombre, detalle } = textoEtiqueta(c);
  return (nombre.length + detalle.length) * 7 + 28;
}

function iconoPin(c: ResumenCiudad) {
  return divIcon({
    className: "bg-transparent",
    iconSize: [0, 0],
    html: `<span class="block size-5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-white shadow-md ${fondoCiudad(c)}"></span>`,
  });
}

interface EtiquetaColocada {
  c: ResumenCiudad;
  x: number;
  y: number;
  ancho: number;
  /** Pin al que apunta la línea guía; `null` si la etiqueta queda pegada al pin. */
  guia: { x1: number; y1: number; x2: number; y2: number } | null;
}

interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

function chocan(a: Caja, b: Caja, margen: number): boolean {
  return (
    a.x < b.x + b.ancho + margen &&
    b.x < a.x + a.ancho + margen &&
    a.y < b.y + b.alto + margen &&
    b.y < a.y + a.alto + margen
  );
}

const DISTANCIAS = [HOLGURA_PIN, 34, 62, 92];
const DESPLAZAMIENTOS_Y = [0, -1, 1, -2, 2, -3, 3];

/**
 * Coloca cada etiqueta junto a su pin probando posiciones (derecha/izquierda, con
 * desplazamiento vertical) hasta hallar una que no tape otra etiqueta ni otro pin;
 * si se aleja del pin, une ambos con una línea guía.
 */
function colocarEtiquetas(
  map: ReturnType<typeof useMap>,
  ciudades: ResumenCiudad[],
): EtiquetaColocada[] {
  const { x: anchoMapa, y: altoMapa } = map.getSize();
  const puntos = ciudades
    .map((c) => ({ c, p: map.latLngToContainerPoint([c.ciudad.lat, c.ciudad.lng]) }))
    .sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x);
  const pines: Caja[] = puntos.map(({ p }) => ({
    x: p.x - RADIO_PIN,
    y: p.y - RADIO_PIN,
    ancho: RADIO_PIN * 2,
    alto: RADIO_PIN * 2,
  }));
  const colocadas: EtiquetaColocada[] = [];
  puntos.forEach(({ c, p }, i) => {
    const ancho = anchoEtiqueta(c);
    const propio = pines[i];
    const candidatas: Caja[] = [];
    for (const d of DISTANCIAS) {
      for (const k of DESPLAZAMIENTOS_Y) {
        const y = p.y - ALTO_ETIQUETA / 2 + k * (ALTO_ETIQUETA + SEPARACION_ETIQUETA);
        candidatas.push({ x: p.x + d, y, ancho, alto: ALTO_ETIQUETA });
        candidatas.push({ x: p.x - d - ancho, y, ancho, alto: ALTO_ETIQUETA });
      }
    }
    const dentro = (k: Caja) =>
      k.x >= 4 &&
      k.y >= 56 &&
      k.x + k.ancho <= anchoMapa - 4 &&
      k.y + k.alto <= altoMapa - 60;
    const libre = (k: Caja) =>
      !colocadas.some((o) =>
        chocan(k, { ...o, alto: ALTO_ETIQUETA }, SEPARACION_ETIQUETA),
      ) &&
      !pines.some((o, j) => j !== i && chocan(k, o, 2)) &&
      !chocan(k, propio, 0);
    const elegida =
      candidatas.find((k) => dentro(k) && libre(k)) ??
      candidatas.find((k) => libre(k)) ??
      candidatas[0];
    const lejos =
      Math.abs(elegida.y + ALTO_ETIQUETA / 2 - p.y) > 4 ||
      elegida.x - p.x > HOLGURA_PIN + 2 ||
      p.x - (elegida.x + ancho) > HOLGURA_PIN + 2;
    const x2 = Math.min(Math.max(p.x, elegida.x), elegida.x + ancho);
    const y2 = Math.min(Math.max(p.y, elegida.y), elegida.y + ALTO_ETIQUETA);
    colocadas.push({
      c,
      x: elegida.x,
      y: elegida.y,
      ancho,
      guia: lejos ? { x1: p.x, y1: p.y, x2, y2 } : null,
    });
  });
  return colocadas;
}

/**
 * ¿Sigue vivo el mapa? `map.remove()` (al desmontar el contenedor, p. ej. en el
 * doble montaje de React o al reiniciar la demo) borra sus paneles, y proyectar
 * coordenadas sobre un mapa destruido truena (`_leaflet_pos` de undefined).
 */
function mapaVivo(map: ReturnType<typeof useMap>): boolean {
  return map.getPane("mapPane") !== undefined;
}

/** Etiquetas de ciudad como capa HTML que se recoloca al mover o acercar el mapa. */
function EtiquetasCiudades({ ciudades }: MapaCiudadesProps) {
  const map = useMap();
  const [, setVersion] = useState(0);
  useMapEvents({
    move: () => setVersion((v) => v + 1),
    zoom: () => setVersion((v) => v + 1),
    resize: () => setVersion((v) => v + 1),
  });
  const colocadas = mapaVivo(map) ? colocarEtiquetas(map, ciudades) : [];
  return (
    <div className="pointer-events-none absolute inset-0 z-[650]">
      <svg aria-hidden className="absolute inset-0 size-full">
        {colocadas.map(({ c, guia }) =>
          guia ? (
            <line
              key={c.ciudad.id}
              x1={guia.x1}
              y1={guia.y1}
              x2={guia.x2}
              y2={guia.y2}
              className="stroke-brand-primary/60"
              strokeWidth={1.5}
            />
          ) : null,
        )}
      </svg>
      {colocadas.map(({ c, x, y, ancho }) => {
        const { nombre, detalle } = textoEtiqueta(c);
        return (
          <span
            key={c.ciudad.id}
            style={{ left: x, top: y, width: ancho, height: ALTO_ETIQUETA }}
            className={`absolute flex items-center gap-1.5 rounded-lg border-l-4 bg-white px-2.5 text-xs whitespace-nowrap text-brand-text-muted shadow-md ${bordeCiudad(c)}`}
          >
            <b className="font-semibold text-brand-primary">{nombre}</b>
            {detalle}
          </span>
        );
      })}
    </div>
  );
}

/** Encuadra el mapa sobre las ciudades visibles, con holgura para las etiquetas. */
function EncuadrarCiudades({ ciudades }: MapaCiudadesProps) {
  const map = useMap();
  useEffect(() => {
    if (ciudades.length === 0 || !mapaVivo(map)) return;
    map.fitBounds(
      ciudades.map((c) => [c.ciudad.lat, c.ciudad.lng] as [number, number]),
      { paddingTopLeft: [90, 90], paddingBottomRight: [90, 80], maxZoom: 8 },
    );
  }, [map, ciudades]);
  return null;
}

export default function MapaCiudades({ ciudades }: MapaCiudadesProps) {
  return (
    <MapaLeaflet
      center={CENTRO}
      zoom={ZOOM}
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
      {ciudades.map((c) => (
        <Marker
          key={c.ciudad.id}
          position={[c.ciudad.lat, c.ciudad.lng]}
          icon={iconoPin(c)}
        >
          <Popup>
            <div className="min-w-48 space-y-2 font-sans">
              <p className="font-heading font-semibold text-brand-primary">
                {c.ciudad.nombre}, {c.ciudad.estado}
              </p>
              <p className="text-xs text-brand-text-muted">
                {c.soloPreventa
                  ? "Preventa"
                  : `${formatPorcentaje(c.ocupacion)} ocupación`}{" "}
                · {formatNumero(c.disponibles)} disponibles
              </p>
              <ul className="space-y-1">
                {c.plazas.map((p) => (
                  <li key={p.plaza.id}>
                    <Link
                      href={rutaPlaza(p.plaza.id)}
                      className="text-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-secondary"
                    >
                      {p.plaza.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        </Marker>
      ))}
      <EncuadrarCiudades ciudades={ciudades} />
      <EtiquetasCiudades ciudades={ciudades} />
    </MapaLeaflet>
  );
}
