"use client";

import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { rutaPlaza } from "@/domain";
import { SectionCard } from "@/components/shared";
import { avisarProximaFase } from "@/lib/avisos";
import { formatNumero, formatPorcentaje } from "@/lib/format";
import type { ResumenCiudad, ResumenPlaza } from "./agregados";
import { fondoCiudad } from "./estilo-rango";

export function OcupacionPorCiudad({ ciudades }: { ciudades: ResumenCiudad[] }) {
  return (
    <SectionCard titulo="Ocupación por ciudad" extra="locales en operación">
      {ciudades.length === 0 ? (
        <p className="text-sm text-brand-text-muted">Sin ciudades con estos filtros.</p>
      ) : (
        <ul className="space-y-2.5">
          {ciudades.map((c) => (
            <li
              key={c.ciudad.id}
              className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm"
            >
              <span className="truncate font-medium text-brand-primary">
                {c.ciudad.nombre}{" "}
                <span className="font-normal text-brand-text-muted">
                  · {c.totalPlazas}
                </span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-brand-cream">
                {c.soloPreventa ? null : (
                  <span
                    className={`block h-full rounded-full ${fondoCiudad(c)}`}
                    style={{ width: `${c.ocupacion * 100}%` }}
                  />
                )}
              </span>
              <span className="text-right font-medium text-brand-primary tabular-nums">
                {c.soloPreventa ? "—" : formatPorcentaje(c.ocupacion)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function MasDisponibilidad({ plazas }: { plazas: ResumenPlaza[] }) {
  return (
    <SectionCard
      titulo="Más disponibilidad"
      extra={
        <button
          type="button"
          onClick={avisarProximaFase}
          className="inline-flex items-center gap-1 hover:text-brand-primary"
        >
          ver todas <ArrowRight aria-hidden className="size-3.5" />
        </button>
      }
    >
      {plazas.length === 0 ? (
        <p className="text-sm text-brand-text-muted">Sin plazas con disponibilidad.</p>
      ) : (
        <ul className="divide-y divide-brand-line">
          {plazas.map((p) => (
            <li key={p.plaza.id}>
              <Link
                href={rutaPlaza(p.plaza.id)}
                className="flex items-center gap-3 py-2.5 text-sm hover:text-brand-secondary"
              >
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-cream text-brand-primary"
                >
                  <Building2 className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-brand-primary">
                    {p.plaza.nombre}
                  </span>
                  <span className="block text-brand-text-muted">
                    {p.ciudad.nombre} · {formatNumero(p.totalLocales)} locales
                  </span>
                </span>
                {p.plaza.estatus === "PREVENTA" ? (
                  <span className="shrink-0 rounded-full bg-brand-indigo/15 px-2.5 py-1 text-xs font-medium text-brand-indigo">
                    Nueva · preventa
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-brand-secondary/20 px-2.5 py-1 text-xs font-medium text-brand-primary">
                    {formatNumero(p.disponibles)} disp.
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
