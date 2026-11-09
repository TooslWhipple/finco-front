"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import {
  EmptyState,
  MoneyAmount,
  SectionCard,
  SegmentedControl,
  StatusChip,
} from "@/components/shared";
import { can } from "@/config/permissions";
import { DEMO_TODAY, META_CUMPLIMIENTO_DEFECTO } from "@/domain";
import {
  useContratos,
  useCotizaciones,
  useExcepciones,
  useLocales,
  usePlazas,
  useSesion,
} from "@/hooks";
import { cn } from "@/lib/utils";
import { excepcionesDeVista, simularExcepcion, type VistaExcepciones } from "./calculos";
import { PanelExcepcion } from "./panel-excepcion";

/** Filas que muestra la vista de resueltas: hay cientos de históricas aplicadas. */
const MAX_RESUELTAS = 30;

const MENSAJE_VACIO: Record<VistaExcepciones, string> = {
  POR_AUTORIZAR: "Cuando Ventas solicite una excepción de precio aparecerá aquí.",
  POR_APLICAR: "Cuando Dirección autorice una excepción aparecerá aquí para aplicarla.",
  RESUELTAS: "Las excepciones aplicadas o rechazadas aparecerán aquí.",
};

/** Excepciones de precio en dos pasos: Dirección autoriza y la PMO aplica. */
export function PestanaExcepciones() {
  const { rol } = useSesion();
  const excepciones = useExcepciones();
  const cotizaciones = useCotizaciones();
  const locales = useLocales().datos;
  const plazas = usePlazas().datos;
  const contratos = useContratos().datos;
  const [vistaElegida, setVistaElegida] = useState<VistaExcepciones>();
  const [elegida, setElegida] = useState<string>();

  const porAutorizar = excepcionesDeVista(excepciones, "POR_AUTORIZAR");
  const porAplicar = excepcionesDeVista(excepciones, "POR_APLICAR");
  // Cada rol abre en la vista que le toca atender.
  const vista = vistaElegida ?? (rol === "PMO" ? "POR_APLICAR" : "POR_AUTORIZAR");
  const lista = useMemo(
    () => excepcionesDeVista(excepciones, vista).slice(0, MAX_RESUELTAS),
    [excepciones, vista],
  );
  const seleccionada = lista.find((e) => e.id === elegida) ?? lista[0];

  const local = locales?.find((l) => l.id === seleccionada?.localId);
  const plaza = plazas?.find((p) => p.id === local?.plazaId);
  const cotizacion = cotizaciones.find((c) => c.id === seleccionada?.cotizacionId);
  const metaPct = plaza?.metaCumplimientoPct ?? META_CUMPLIMIENTO_DEFECTO;
  const simulacion = useMemo(
    () =>
      seleccionada && local && locales && contratos && cotizacion
        ? simularExcepcion(
            seleccionada,
            local,
            locales.filter((l) => l.plazaId === local.plazaId),
            contratos,
            metaPct,
            cotizacion.plazoMeses,
            DEMO_TODAY,
          )
        : undefined,
    [seleccionada, local, locales, contratos, cotizacion, metaPct],
  );

  return (
    <div className="space-y-4">
      <SegmentedControl
        etiqueta="Vista de excepciones"
        opciones={[
          { valor: "POR_AUTORIZAR", etiqueta: `Por autorizar (${porAutorizar.length})` },
          { valor: "POR_APLICAR", etiqueta: `Por aplicar (${porAplicar.length})` },
          { valor: "RESUELTAS", etiqueta: "Resueltas" },
        ]}
        valor={vista}
        onChange={(v) => {
          setVistaElegida(v);
          setElegida(undefined);
        }}
      />
      {!seleccionada ? (
        <EmptyState
          icono={Inbox}
          titulo="Sin excepciones"
          descripcion={MENSAJE_VACIO[vista]}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <SectionCard titulo="Solicitudes" sinPadding>
            <ul className="divide-y divide-brand-line">
              {lista.map((e) => {
                const l = locales?.find((x) => x.id === e.localId);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setElegida(e.id)}
                      aria-current={e.id === seleccionada.id}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-cream",
                        e.id === seleccionada.id && "bg-brand-cream",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-brand-text">
                          {l?.codigo ?? e.localId} · {e.cotizacionId}
                        </span>
                        <span className="block text-xs text-brand-text-muted">
                          {e.solicitadaPor} ·{" "}
                          <MoneyAmount valor={e.rentaSolicitada} sufijo="/mes" />
                        </span>
                      </span>
                      <StatusChip estatus={e.estado} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
          <PanelExcepcion
            key={seleccionada.id}
            excepcion={seleccionada}
            cotizacion={cotizacion}
            local={local}
            plaza={plaza?.nombre}
            metaPct={metaPct}
            simulacion={simulacion}
            puedeAutorizar={can(rol, "excepcion.autorizar")}
            puedeAplicar={can(rol, "excepcion.aplicar")}
          />
        </div>
      )}
    </div>
  );
}
