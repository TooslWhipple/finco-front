"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, CircleCheck, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { Ayuda, BarraFiltros, EmptyState, PillsFiltro } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { DEMO_TODAY, INPC_ANUAL, type ReglaActualizacion } from "@/domain";
import {
  useCambiosAnuales,
  useCiudades,
  useContratos,
  useLocales,
  useLocatarios,
  usePlazas,
  useSesion,
} from "@/hooks";
import { formatFecha, formatMoneda, formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { formatPuntosUnDecimal } from "./calculos";
import { TEXTOS_PRECIO } from "./textos-precio";

const TODAS = "TODAS";
const ANIVERSARIO = "ANIVERSARIO";
/** Cambios que quedan fuera de la preselección para revisarlos a mano. */
const REVISION_MANUAL = 2;
/** Ciudades con pill propia, ordenadas por cantidad de cambios. */
const MAX_PILLS_CIUDAD = 2;

interface BandejaProps {
  /** Resalta la fila de este local (pantalla de detalle). */
  localIdDestacado?: string;
}

function Casilla({
  marcada,
  onChange,
  etiqueta,
  disabled,
}: {
  marcada: boolean;
  onChange: () => void;
  etiqueta: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
        marcada
          ? "border-brand-secondary bg-brand-secondary text-white"
          : "border-brand-line bg-card",
      )}
    >
      {marcada ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : null}
    </button>
  );
}

function descripcionPuntos(reglas: readonly ReglaActualizacion[]): string {
  const [primera] = reglas;
  if (
    !primera ||
    primera.tipo !== "INPC_PTS" ||
    reglas.some((r) => r.tipo !== "INPC_PTS" || r.puntos !== primera.puntos)
  ) {
    return "";
  }
  const pts = primera.puntos ?? 0;
  return ` + ${pts} pt${pts === 1 ? "" : "s"}`;
}

/**
 * Bandeja de actualización anual: cambios de precio propuestos por la regla de
 * cada local. Aprobar o rechazar los mueve en el store (y baja el badge del sidebar).
 */
export function BandejaActualizacionAnual({ localIdDestacado }: BandejaProps) {
  const { rol } = useSesion();
  const puedeResolver = can(rol, "actualizacionAnual.resolver");
  const cambios = useCambiosAnuales();
  const locales = useLocales().datos;
  const plazas = usePlazas().datos;
  const locatarios = useLocatarios().datos;
  const contratos = useContratos().datos;
  const resolver = useAppStore((s) => s.resolverCambiosAnuales);

  const año = useMemo(() => Math.max(...cambios.map((c) => c.año), 0), [cambios]);

  const [filtro, setFiltro] = useState(TODAS);
  // Preselección: todos los pendientes salvo los últimos, que quedan para revisión manual.
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(() => {
    const ids = cambios.filter((c) => c.estado === "PENDIENTE").map((c) => c.localId);
    return new Set(ids.slice(0, Math.max(0, ids.length - REVISION_MANUAL)));
  });

  const pendientes = useMemo(() => {
    if (!locales || !plazas) return [];
    const porLocal = new Map(locales.map((l) => [l.id, l]));
    const porPlaza = new Map(plazas.map((p) => [p.id, p]));
    const porLocatario = new Map((locatarios ?? []).map((l) => [l.id, l.nombre]));
    return cambios
      .filter((c) => c.año === año && c.estado === "PENDIENTE")
      .flatMap((c) => {
        const local = porLocal.get(c.localId);
        const plaza = local ? porPlaza.get(local.plazaId) : undefined;
        return local && plaza
          ? [
              {
                cambio: c,
                local,
                plaza,
                locatario: local.locatarioId
                  ? porLocatario.get(local.locatarioId)
                  : undefined,
              },
            ]
          : [];
      });
  }, [cambios, locales, plazas, locatarios, año]);

  const opcionesCiudad = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const f of pendientes) {
      conteo.set(f.plaza.ciudadId, (conteo.get(f.plaza.ciudadId) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_PILLS_CIUDAD)
      .map(([id]) => id);
  }, [pendientes]);
  const ciudades = useCiudadesPorId();

  const filas = pendientes.filter((f) =>
    filtro === TODAS
      ? true
      : filtro === ANIVERSARIO
        ? f.local.regla.cuando === "ANIVERSARIO"
        : f.plaza.ciudadId === filtro,
  );

  const idsSeleccionados = filas.map((f) => f.local.id).filter((id) => seleccion.has(id));

  const opcionesPills = [
    { valor: TODAS, etiqueta: "Todas las plazas" },
    ...opcionesCiudad.map((id) => ({ valor: id, etiqueta: ciudades.get(id) ?? id })),
    { valor: ANIVERSARIO, etiqueta: "Por aniversario" },
  ];

  const resumenAnterior = useMemo(() => {
    if (!locales || !contratos) return null;
    const porLocal = new Map(locales.map((l) => [l.id, l]));
    const vigentes = contratos.filter(
      (c) => c.inicio <= DEMO_TODAY && c.fin >= DEMO_TODAY,
    );
    return {
      actualizados: vigentes.length,
      bajoMinimo: vigentes.filter((c) => {
        const l = porLocal.get(c.localId);
        return l ? c.rentaMensual < l.precioMinimo : false;
      }).length,
    };
  }, [locales, contratos]);

  function alternar(id: string) {
    setSeleccion((previa) => {
      const siguiente = new Set(previa);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function resolverSeleccion(resolucion: "APROBADO" | "RECHAZADO") {
    if (idsSeleccionados.length === 0) return;
    resolver(idsSeleccionados, año, resolucion);
    toast.success(
      `${formatNumero(idsSeleccionados.length)} cambio${idsSeleccionados.length === 1 ? "" : "s"} ${
        resolucion === "APROBADO" ? "aprobado" : "rechazado"
      }${idsSeleccionados.length === 1 ? "" : "s"}`,
    );
    setSeleccion((previa) => {
      const siguiente = new Set(previa);
      for (const id of idsSeleccionados) siguiente.delete(id);
      return siguiente;
    });
  }

  const totalPendientes = pendientes.length;
  const inpc = INPC_ANUAL[año];
  const sufijoPuntos = descripcionPuntos(pendientes.map((f) => f.local.regla));
  const n = idsSeleccionados.length;

  return (
    <section className="flex h-full flex-col rounded-xl border border-brand-line bg-card shadow-xs">
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2.5">
          <CircleCheck aria-hidden className="size-5 text-brand-secondary" />
          <h2 className="font-heading text-base font-semibold text-brand-primary">
            Bandeja de aprobación
          </h2>
          <span className="rounded-full bg-brand-cta/15 px-2.5 py-0.5 text-xs font-medium text-brand-cta">
            {formatNumero(totalPendientes)} pendiente{totalPendientes === 1 ? "" : "s"}
          </span>
        </div>
        {año ? (
          <p className="mt-1.5 text-sm text-brand-text-muted">
            Actualización anual {año}
            {inpc !== undefined
              ? ` · INPC estimado ${formatPuntosUnDecimal(inpc)}${sufijoPuntos}`
              : ""}
            {` · se aplica el ${formatFecha(`${año}-01-01`)}`}
          </p>
        ) : null}
      </div>
      <div className="px-5 pt-4">
        <BarraFiltros envolver>
          <PillsFiltro
            envolver
            etiqueta="Filtrar bandeja"
            opciones={opcionesPills}
            valor={filtro}
            onChange={setFiltro}
          />
        </BarraFiltros>
      </div>
      <div className="flex-1 pt-3">
        {filas.length === 0 ? (
          <EmptyState
            icono={Inbox}
            titulo="Bandeja vacía"
            descripcion="No hay cambios de precio por revisar con estos filtros."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-xs tracking-wide text-brand-text-muted uppercase">
                  <th className="w-12 py-2 pl-5" />
                  <th className="py-2 font-medium">Local / locatario</th>
                  <th className="py-2 pr-4 text-right font-medium">
                    <Ayuda texto={TEXTOS_PRECIO.lista.ayuda}>Lista</Ayuda>
                    <span className="block font-normal normal-case">
                      actual → propuesta
                    </span>
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">
                    <Ayuda texto={TEXTOS_PRECIO.minimo.ayuda}>Mínimo</Ayuda>
                    <span className="block font-normal normal-case">
                      actual → propuesto
                    </span>
                  </th>
                  <th className="py-2 pr-5 text-right font-medium">Regla</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ cambio, local, plaza, locatario }) => (
                  <tr
                    key={`${cambio.localId}-${cambio.año}`}
                    className={cn(
                      "border-b border-brand-line last:border-b-0",
                      local.id === localIdDestacado && "bg-brand-cta/5",
                    )}
                  >
                    <td className="py-3 pl-5">
                      {puedeResolver ? (
                        <Casilla
                          etiqueta={`Seleccionar local ${local.codigo}, ${plaza.nombre}`}
                          marcada={seleccion.has(local.id)}
                          onChange={() => alternar(local.id)}
                        />
                      ) : null}
                    </td>
                    <td className="max-w-0 py-3 pr-3">
                      <Link
                        href={`/plazas/${local.plazaId}/locales/${local.id}`}
                        className="line-clamp-2 font-medium text-brand-primary hover:underline"
                      >
                        {local.codigo} · {plaza.nombre}
                      </Link>
                      {locatario ? (
                        <p className="truncate text-xs text-brand-text-muted">
                          {locatario}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      <span className="block text-xs text-brand-text-muted">
                        {formatMoneda(cambio.precioActual)}
                      </span>
                      <span className="font-semibold">
                        {formatMoneda(cambio.precioPropuesto)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">
                      <span className="block text-xs text-brand-text-muted">
                        {formatMoneda(cambio.minimoActual)}
                      </span>
                      <span className="font-semibold">
                        {formatMoneda(cambio.minimoPropuesto)}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <span className="rounded-full bg-brand-secondary/15 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-brand-primary">
                        +{formatPuntosUnDecimal(cambio.variacionPct)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {resumenAnterior ? (
        <p className="mx-5 mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-brand-cream px-4 py-3 text-sm text-brand-text-muted">
          <span className="rounded-md bg-brand-line px-2 py-0.5 text-xs font-semibold text-brand-text">
            {año - 1}
          </span>
          {formatNumero(resumenAnterior.actualizados)} locales se actualizaron con su
          regla · {formatNumero(resumenAnterior.bajoMinimo)} contratos bajo el mínimo
        </p>
      ) : null}
      {puedeResolver ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-line px-5 py-4">
          <span className="text-sm text-brand-text-muted">
            {formatNumero(n)} de {formatNumero(filas.length)} seleccionado
            {n === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={n === 0}
              onClick={() => resolverSeleccion("RECHAZADO")}
            >
              <X aria-hidden />
              Rechazar
            </Button>
            <Button disabled={n === 0} onClick={() => resolverSeleccion("APROBADO")}>
              <Check aria-hidden />
              {n === 0
                ? "Aprobar"
                : `Aprobar ${formatNumero(n)} cambio${n === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="pb-4" />
      )}
    </section>
  );
}

/** Nombre de ciudad por id. */
function useCiudadesPorId(): ReadonlyMap<string, string> {
  const ciudades = useCiudades().datos;
  return useMemo(
    () => new Map((ciudades ?? []).map((c) => [c.id, c.nombre])),
    [ciudades],
  );
}
