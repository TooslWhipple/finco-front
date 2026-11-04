"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, History, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { StatusChip } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { prospectosPorLocal } from "@/domain";
import {
  useCiudades,
  useLocal,
  usePlantas,
  usePlaza,
  useProspectos,
  useSesion,
} from "@/hooks";
import { formatMoneda, formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import type { EntradaBitacora } from "@/store/reducers";
import { BandejaActualizacionAnual } from "./bandeja-actualizacion-anual";
import { construirHistorial, frenteLocalM } from "./calculos";
import { HistorialCambios } from "./historial-cambios";
import { PrecioReglaLocal } from "./precio-regla-local";

const SIN_BITACORA: readonly EntradaBitacora[] = [];

export function LocalDetalle({ plazaId, localId }: { plazaId: string; localId: string }) {
  const { rol } = useSesion();
  const plaza = usePlaza(plazaId).datos;
  const local = useLocal(localId).datos;
  const plantas = usePlantas(plazaId).datos;
  const prospectosTodos = useProspectos().datos;
  const bitacora =
    useAppStore((s) => s.locales.ajustes[localId]?.bitacora) ?? SIN_BITACORA;

  const [verHistorial, setVerHistorial] = useState(false);
  const ciudad = useCiudades().datos?.find((c) => c.id === plaza?.ciudadId);

  const historial = useMemo(
    () => (local ? construirHistorial(local.historial, bitacora, formatMoneda) : []),
    [local, bitacora],
  );

  if (!local || !plaza) {
    return <p className="text-sm text-brand-text-muted">Cargando local…</p>;
  }

  const planta = plantas?.find((p) => p.id === local.plantaId);
  const puedeEditarMinimo = can(rol, "precioMinimo.editar");
  const puedeEditarRegla = can(rol, "regla.editar");
  const cotizable = local.estatus === "DISPONIBLE" && can(rol, "cotizaciones.crear");

  const sobretitulo = [
    plaza.nombre,
    ciudad?.nombre,
    planta?.nombre ?? "Planta",
    `${formatNumero(local.areaM2)} m²`,
    `Frente ${frenteLocalM(local.areaM2).toLocaleString("es-MX", { minimumFractionDigits: 1 })} m`,
    local.giro ? `Giro permitido: ${local.giro.toLowerCase()}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const prospectos = prospectosPorLocal(prospectosTodos ?? []).get(local.id)?.length ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-brand-text-muted">{sobretitulo}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 font-heading text-2xl font-bold text-brand-primary">
            Local {local.codigo}
            <StatusChip estatus={local.estatus} />
            {prospectos > 0 ? (
              <Link
                href={`/prospectos?local=${local.id}`}
                className="rounded-full bg-brand-indigo/10 px-2.5 py-0.5 font-sans text-xs font-medium text-brand-indigo hover:bg-brand-indigo/20"
              >
                {prospectos} prospecto{prospectos === 1 ? "" : "s"}
              </Link>
            ) : null}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setVerHistorial(true)}>
            <History aria-hidden />
            Historial de cambios
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Disponible en la siguiente fase")}
          >
            <Settings2 aria-hidden />
            Editar ficha
          </Button>
          {cotizable ? (
            <Link
              href={`/cotizaciones/nueva?local=${local.id}`}
              className={cn(
                buttonVariants(),
                "bg-brand-cta text-white hover:bg-brand-cta-light",
              )}
            >
              <FileText aria-hidden className="size-4" />
              Crear cotización
            </Link>
          ) : null}
        </div>
      </header>
      {!puedeEditarMinimo && !puedeEditarRegla ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. El precio mínimo y la regla anual los gestiona
          Superadmin.
        </p>
      ) : null}

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <PrecioReglaLocal local={local} plaza={plaza} />
        <div className="min-w-0">
          <BandejaActualizacionAnual localIdDestacado={local.id} />
        </div>
      </div>

      <HistorialCambios
        abierto={verHistorial}
        onAbiertoChange={setVerHistorial}
        codigoLocal={local.codigo}
        entradas={historial}
      />
    </div>
  );
}
