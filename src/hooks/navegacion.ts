"use client";

import { useMemo } from "react";
import { DEMO_TODAY, estatusCobro, type Rol } from "@/domain";
import type { IdBadge } from "@/config/navigation";
import { MES_DEMO } from "@/lib/tiempo";
import { useAppStore } from "@/store";
import { contarCambiosPendientes, contarExcepcionesPendientes } from "@/store/reducers";
import { useFacturas } from "./datos";

/** Contadores de los badges del sidebar, calculados de los datos vivos. */
export function useBadges(): Record<IdBadge, number> {
  const aprobaciones = useAppStore((s) => s.aprobaciones);
  const facturas = useFacturas(MES_DEMO);
  const vencidas = useMemo(
    () =>
      facturas.datos?.filter((f) => estatusCobro(f, DEMO_TODAY) === "VENCIDA").length ??
      0,
    [facturas.datos],
  );
  return {
    cobranza: vencidas,
    aprobaciones:
      contarExcepcionesPendientes(aprobaciones) + contarCambiosPendientes(aprobaciones),
  };
}

export interface Notificacion {
  id: string;
  titulo: string;
  detalle: string;
  ruta: string;
}

/** Avisos de la campana: lo que le toca atender a cada rol. */
export function useNotificaciones(rol: Rol | null): Notificacion[] {
  const aprobaciones = useAppStore((s) => s.aprobaciones);
  const badges = useBadges();
  return useMemo(() => {
    if (!rol) return [];
    const excepcionesPend = contarExcepcionesPendientes(aprobaciones);
    const cambiosPend = contarCambiosPendientes(aprobaciones);
    switch (rol) {
      case "SUPERADMIN":
        return [
          ...(excepcionesPend > 0
            ? [
                {
                  id: "excepciones",
                  titulo: `${excepcionesPend} excepciones de precio por resolver`,
                  detalle: "Ventas espera tu respuesta para generar contrato.",
                  ruta: "/precios-y-reglas",
                },
              ]
            : []),
          ...(cambiosPend > 0
            ? [
                {
                  id: "anual",
                  titulo: `${cambiosPend} locales en la bandeja de actualización anual`,
                  detalle: "Cambios de precio propuestos por la regla de cada local.",
                  ruta: "/precios-y-reglas",
                },
              ]
            : []),
        ];
      case "VENTAS":
        return aprobaciones.excepciones
          .filter((e) => e.estado !== "PENDIENTE")
          .map((e) => ({
            id: e.id,
            titulo: `Excepción ${e.estado === "APROBADA" ? "aprobada" : "rechazada"}`,
            detalle: `Cotización ${e.cotizacionId}${e.resueltaPor ? ` · ${e.resueltaPor}` : ""}`,
            ruta: `/cotizaciones/${e.cotizacionId}`,
          }));
      case "COBRANZA":
        return badges.cobranza > 0
          ? [
              {
                id: "vencidas",
                titulo: `${badges.cobranza} cuentas con atraso`,
                detalle: "Pendientes de seguimiento en el corte de noviembre.",
                ruta: "/cobranza",
              },
            ]
          : [];
      case "DIRECCION":
        return badges.cobranza > 0
          ? [
              {
                id: "cartera",
                titulo: `${badges.cobranza} cuentas con atraso`,
                detalle: "Revisa la cartera vencida en Cobranza.",
                ruta: "/cobranza",
              },
            ]
          : [];
    }
  }, [rol, aprobaciones, badges.cobranza]);
}
