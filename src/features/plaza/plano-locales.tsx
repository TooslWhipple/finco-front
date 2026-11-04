"use client";

import { useState } from "react";
import { LIENZO, type ContextoVial } from "@/data/planos";
import type { Local } from "@/domain";
import { formatDiaMes, formatMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CATEGORIAS, ETIQUETA_CATEGORIA, type CategoriaLocal } from "./resumen";

/** Clases de relleno/trazo del SVG por categoría (solo tokens de marca). */
const ESTILO_CATEGORIA: Record<
  CategoriaLocal,
  { rect: string; texto: string; muestra: string }
> = {
  DISPONIBLE: {
    rect: "fill-brand-secondary stroke-brand-secondary",
    texto: "fill-white",
    muestra: "bg-brand-secondary",
  },
  RENTADO: {
    rect: "fill-brand-line stroke-brand-line",
    texto: "fill-brand-text-muted",
    muestra: "bg-brand-line",
  },
  POR_VENCER: {
    rect: "fill-brand-cta stroke-brand-cta",
    texto: "fill-white",
    muestra: "bg-brand-cta",
  },
  EN_COTIZACION: {
    rect: "fill-brand-indigo stroke-brand-indigo",
    texto: "fill-white",
    muestra: "bg-brand-indigo",
  },
  CON_ATRASO: {
    rect: "fill-brand-coral/15 stroke-brand-coral [stroke-dasharray:5_4]",
    texto: "fill-brand-coral",
    muestra: "border border-dashed border-brand-coral bg-brand-coral/15",
  },
  PREVENTA: {
    rect: "fill-brand-indigo/35 stroke-brand-indigo/35",
    texto: "fill-brand-primary",
    muestra: "bg-brand-indigo/35",
  },
};

interface PlanoLocalesProps {
  locales: readonly Local[];
  categorias: ReadonlyMap<string, CategoriaLocal>;
  /** Nombre del locatario por local (se muestra en las anclas). */
  locatarios: ReadonlyMap<string, string>;
  /** Prospectos activos por local (los locales sin ninguno no aparecen). */
  prospectos: ReadonlyMap<string, number>;
  /** Locales que pasan los filtros; el resto se atenúa. */
  coincidentes: ReadonlySet<string>;
  /** Bulevares y estacionamiento de la planta, si tiene layout dibujado. */
  contexto?: ContextoVial;
  seleccionadoId: string | undefined;
  onSeleccionar: (id: string) => void;
}

export function PlanoLocales({
  locales,
  categorias,
  locatarios,
  prospectos,
  coincidentes,
  contexto,
  seleccionadoId,
  onSeleccionar,
}: PlanoLocalesProps) {
  const [activoId, setActivoId] = useState<string>();
  const activo = locales.find((l) => l.id === activoId);
  const prospectosActivo = activo ? (prospectos.get(activo.id) ?? 0) : 0;

  const presentes = new Set(categorias.values());
  const leyenda = CATEGORIAS.filter((c) => presentes.has(c));
  const parking = contexto?.estacionamiento;
  const vista = calcularVista(locales, Boolean(contexto));

  const centroPct = activo
    ? ((activo.geometria.x + activo.geometria.w / 2) / LIENZO.ancho) * 100
    : 0;
  const topPct = activo
    ? ((activo.geometria.y + activo.geometria.h - vista.y) / vista.alto) * 100 + 1.5
    : 0;
  // El cuerpo del tooltip se acota a los bordes del plano; la flecha sigue al local.
  const desplazamiento = Math.min(80, Math.max(20, centroPct)) - centroPct;

  return (
    <div className="relative">
      <svg
        viewBox={`0 ${vista.y} ${LIENZO.ancho} ${vista.alto}`}
        role="group"
        aria-label="Plano de locales"
        className="h-auto w-full"
      >
        {contexto && parking ? (
          <g aria-hidden>
            <text
              x={contexto.rotuloSuperior.x}
              y={contexto.rotuloSuperior.y}
              className="fill-brand-text-muted text-[16px] font-medium tracking-[0.2em]"
            >
              {contexto.rotuloSuperior.texto}
            </text>
            <text
              transform={`translate(${contexto.rotuloVertical.x} ${contexto.rotuloVertical.y}) rotate(90)`}
              className="fill-brand-text-muted text-[16px] font-medium tracking-[0.2em]"
            >
              {contexto.rotuloVertical.texto}
            </text>
            <rect
              x={parking.x}
              y={parking.y}
              width={parking.w}
              height={parking.h}
              rx={14}
              className="fill-brand-cream stroke-brand-line"
            />
            {parking.yFilas.map((y) =>
              Array.from({ length: parking.cajones / parking.filas }, (_, i) => {
                const ancho = (parking.w - 32) / (parking.cajones / parking.filas);
                return (
                  <rect
                    key={`${y}-${i}`}
                    x={parking.x + 16 + i * ancho + 2}
                    y={y}
                    width={ancho - 4}
                    height={parking.altoFila}
                    rx={3}
                    className="fill-card stroke-brand-line"
                  />
                );
              }),
            )}
            <text
              x={parking.x + parking.w / 2}
              y={parking.yEtiqueta}
              textAnchor="middle"
              className="fill-brand-text-muted text-[17px] font-medium tracking-[0.25em]"
            >
              {`ESTACIONAMIENTO · ${parking.cajones} CAJONES`}
            </text>
          </g>
        ) : null}
        {locales.map((l) => {
          const g = l.geometria;
          const cat = categorias.get(l.id) ?? "RENTADO";
          const estilo = ESTILO_CATEGORIA[cat];
          const seleccionado = l.id === seleccionadoId;
          const atenuado = !coincidentes.has(l.id);
          const nombre = l.ancla ? locatarios.get(l.id) : undefined;
          return (
            <g
              key={l.id}
              role="button"
              tabIndex={0}
              aria-label={`Local ${l.codigo}, ${ETIQUETA_CATEGORIA[cat]}`}
              aria-pressed={seleccionado}
              onClick={() => onSeleccionar(l.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeleccionar(l.id);
                }
              }}
              onMouseEnter={() => setActivoId(l.id)}
              onMouseLeave={() => setActivoId(undefined)}
              onFocus={() => setActivoId(l.id)}
              onBlur={() => setActivoId(undefined)}
              className={cn(
                "cursor-pointer transition-opacity outline-none",
                atenuado && "opacity-25",
              )}
            >
              <rect
                x={g.x}
                y={g.y}
                width={g.w}
                height={g.h}
                rx={6}
                strokeWidth={1.5}
                className={estilo.rect}
              />
              {seleccionado ? (
                <rect
                  x={g.x - 2}
                  y={g.y - 2}
                  width={g.w + 4}
                  height={g.h + 4}
                  rx={8}
                  fill="none"
                  strokeWidth={3}
                  className="stroke-brand-primary"
                />
              ) : null}
              {nombre ? (
                <text textAnchor="middle" className="fill-brand-primary">
                  {lineasNombre(nombre).map((linea, i, todas) => (
                    <tspan
                      key={linea}
                      x={g.x + g.w / 2}
                      y={g.y + g.h / 2 - 6 - (todas.length - 1 - i) * 19}
                      className="text-[17px] font-semibold"
                    >
                      {linea}
                    </tspan>
                  ))}
                  <tspan
                    x={g.x + g.w / 2}
                    y={g.y + g.h / 2 + 28}
                    className="fill-brand-text-muted text-[16px] font-normal"
                  >
                    {l.codigo} · ancla
                  </tspan>
                </text>
              ) : (
                <text
                  x={g.x + g.w / 2}
                  y={g.y + g.h / 2 + 5}
                  textAnchor="middle"
                  className={cn("text-[17px] font-bold", estilo.texto)}
                >
                  {l.codigo}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {activo ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-0"
          style={{ left: `${centroPct}%`, top: `${topPct}%` }}
        >
          <span
            aria-hidden
            className="absolute -top-1 left-0 size-2.5 -translate-x-1/2 rotate-45 bg-brand-primary"
          />
          <div
            className="absolute top-0 w-max -translate-x-1/2 rounded-lg bg-brand-primary px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
            style={{ left: `${desplazamiento}%` }}
          >
            <p className="flex justify-between gap-4 font-semibold">
              <span>
                {activo.codigo} ·{" "}
                {ETIQUETA_CATEGORIA[categorias.get(activo.id) ?? "RENTADO"]}
              </span>
              <span className="font-normal opacity-70">{activo.areaM2} m²</span>
            </p>
            <p className="mt-1 opacity-90">
              Precio de lista {formatMoneda(activo.precioVigente)} / mes
            </p>
            {activo.estatus === "DISPONIBLE" && activo.libreDesde ? (
              <p className="opacity-90">
                Libre desde {formatDiaMes(activo.libreDesde)}
                {prospectosActivo
                  ? ` · ${prospectosActivo} prospecto${prospectosActivo === 1 ? "" : "s"}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-brand-line pt-3 text-sm text-brand-text">
        {leyenda.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn("size-3 rounded-sm", ESTILO_CATEGORIA[c].muestra)}
            />
            {ETIQUETA_CATEGORIA[c]}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Parte el nombre de un ancla en hasta dos líneas de ≈12 caracteres. */
function lineasNombre(nombre: string): string[] {
  const palabras = nombre.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    if (actual && `${actual} ${palabra}`.length > 12) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = actual ? `${actual} ${palabra}` : palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** Márgenes (unidades del SVG) alrededor de los locales cuando no hay contexto vial. */
const MARGEN_VISTA = 4;

/** Ventana vertical del SVG: el lienzo completo con contexto vial, o ceñida a los locales. */
function calcularVista(
  locales: readonly Local[],
  conContexto: boolean,
): { y: number; alto: number } {
  if (conContexto || locales.length === 0) return { y: 0, alto: LIENZO.alto };
  const arriba = Math.min(...locales.map((l) => l.geometria.y));
  const abajo = Math.max(...locales.map((l) => l.geometria.y + l.geometria.h));
  const y = Math.max(0, arriba - MARGEN_VISTA);
  return { y, alto: Math.min(LIENZO.alto, abajo + MARGEN_VISTA) - y };
}
