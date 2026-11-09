"use client";

import { useMemo } from "react";
import {
  contratosSinCaptura,
  DEMO_TODAY,
  estatusCobro,
  semaforoTerreno,
  type ExcepcionPrecio,
  type Rol,
  type Terreno,
} from "@/domain";
import type { IdBadge } from "@/config/navigation";
import { MES_DEMO } from "@/lib/tiempo";
import { useAppStore } from "@/store";
import {
  contarCambiosPendientes,
  contarPorAplicar,
  contarPorAutorizar,
  type ObraState,
} from "@/store/reducers";
import { useFacturas, useTerrenos } from "./datos";

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
      contarPorAutorizar(aprobaciones) +
      contarPorAplicar(aprobaciones) +
      contarCambiosPendientes(aprobaciones),
  };
}

export interface Notificacion {
  id: string;
  titulo: string;
  detalle: string;
  ruta: string;
}

const rutaExpediente = (terrenoId: string) => `/terrenos-y-proyectos/${terrenoId}`;

/** Avisos de obra de un rol: cortes por validar, semanas sin capturar o proyectos en rojo. */
function avisosDeObra(
  rol: Rol,
  obra: ObraState,
  enRojo: readonly Terreno[],
): Notificacion[] {
  const terrenoDe = (contratoId: string) =>
    obra.contratos.find((c) => c.id === contratoId)?.terrenoId;
  const avisoRojo = (): Notificacion[] =>
    enRojo.length === 0
      ? []
      : [
          {
            id: "obra-rojo",
            titulo: `${enRojo.length} ${enRojo.length === 1 ? "proyecto en rojo" : "proyectos en rojo"}`,
            detalle: `${enRojo.map((t) => t.nombre).join(", ")}: revisa el valor ganado.`,
            ruta: rutaExpediente(enRojo[0].id),
          },
        ];
  switch (rol) {
    case "PMO": {
      const porValidar = obra.cortes.filter((c) => c.estado === "FIRMADO_SUPERVISOR");
      const terrenoId = porValidar[0] && terrenoDe(porValidar[0].contratoObraId);
      return [
        ...(porValidar.length > 0 && terrenoId
          ? [
              {
                id: "cortes-por-validar",
                titulo: `${porValidar.length} ${porValidar.length === 1 ? "corte" : "cortes"} por validar`,
                detalle:
                  "El Supervisor firmó y espera tu validación en la pestaña Cortes.",
                ruta: rutaExpediente(terrenoId),
              },
            ]
          : []),
        ...avisoRojo(),
      ];
    }
    case "SUPERVISOR_OBRA": {
      const sinCapturar = contratosSinCaptura(obra.contratos, obra.cortes, DEMO_TODAY);
      const rechazados = obra.cortes.filter((c) => c.estado === "RECHAZADO");
      const sinRecapturar = rechazados.filter(
        (r) =>
          !obra.cortes.some(
            (c) =>
              c.contratoObraId === r.contratoObraId &&
              c.semana === r.semana &&
              c.estado !== "RECHAZADO",
          ),
      );
      return [
        ...(sinCapturar.length > 0
          ? [
              {
                id: "semanas-sin-capturar",
                titulo: `${sinCapturar.length} ${sinCapturar.length === 1 ? "contrato sin corte" : "contratos sin corte"} de la semana anterior`,
                detalle: sinCapturar.map((c) => c.folio).join(", "),
                ruta: rutaExpediente(sinCapturar[0].terrenoId),
              },
            ]
          : []),
        ...(sinRecapturar.length > 0
          ? [
              {
                id: "cortes-rechazados",
                titulo: `${sinRecapturar.length} ${sinRecapturar.length === 1 ? "corte rechazado" : "cortes rechazados"}`,
                detalle: "La PMO pidió corregirlos: vuelve a capturar la semana.",
                ruta: rutaExpediente(terrenoDe(sinRecapturar[0].contratoObraId) ?? ""),
              },
            ]
          : []),
      ];
    }
    case "DIRECCION":
      return avisoRojo();
    case "SUPERADMIN":
    case "VENTAS":
    case "COBRANZA":
      return [];
  }
}

const RUTA_EXCEPCIONES = "/precios-y-reglas";

/** Aviso de excepciones que esperan a Dirección (por autorizar). */
function avisoPorAutorizar(cantidad: number): Notificacion[] {
  return cantidad === 0
    ? []
    : [
        {
          id: "excepciones-por-autorizar",
          titulo: `${cantidad} ${cantidad === 1 ? "excepción de precio por autorizar" : "excepciones de precio por autorizar"}`,
          detalle: "Ventas pidió rentar bajo el mínimo: revisa el impacto en el plan.",
          ruta: RUTA_EXCEPCIONES,
        },
      ];
}

/** Aviso de excepciones autorizadas que espera aplicar la PMO. */
function avisoPorAplicar(cantidad: number): Notificacion[] {
  return cantidad === 0
    ? []
    : [
        {
          id: "excepciones-por-aplicar",
          titulo: `${cantidad} ${cantidad === 1 ? "excepción autorizada por aplicar" : "excepciones autorizadas por aplicar"}`,
          detalle: "Dirección ya autorizó: aplícala para que Ventas genere el contrato.",
          ruta: RUTA_EXCEPCIONES,
        },
      ];
}

const RESULTADO_PARA_VENTAS: Record<
  Exclude<ExcepcionPrecio["estado"], "PENDIENTE">,
  string
> = {
  AUTORIZADA_DIRECCION: "autorizada por Dirección, falta que la PMO la aplique",
  APLICADA: "aplicada: ya puedes generar el contrato",
  RECHAZADA: "rechazada",
};

/** Avisos de la campana: lo que le toca atender a cada rol. */
export function useNotificaciones(rol: Rol | null): Notificacion[] {
  const aprobaciones = useAppStore((s) => s.aprobaciones);
  const cotizaciones = useAppStore((s) => s.cotizaciones.cotizaciones);
  const obra = useAppStore((s) => s.obra);
  const terrenos = useTerrenos().datos;
  const badges = useBadges();
  return useMemo(() => {
    if (!rol) return [];
    const enRojo = terrenos.filter(
      (t) => t.semaforoObra !== undefined && semaforoTerreno(t, DEMO_TODAY) === "ROJO",
    );
    const deObra = avisosDeObra(rol, obra, enRojo);
    const porAutorizar = contarPorAutorizar(aprobaciones);
    const porAplicar = contarPorAplicar(aprobaciones);
    const cambiosPend = contarCambiosPendientes(aprobaciones);
    switch (rol) {
      case "SUPERADMIN":
        return [
          ...avisoPorAutorizar(porAutorizar),
          ...avisoPorAplicar(porAplicar),
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
      case "VENTAS": {
        // Solo sus solicitudes vivas: las históricas no tienen cotización en el estado.
        const abiertas = new Set(
          cotizaciones.filter((c) => c.estado !== "CONTRATO_GENERADO").map((c) => c.id),
        );
        return aprobaciones.excepciones.flatMap((e) =>
          e.estado !== "PENDIENTE" && abiertas.has(e.cotizacionId)
            ? [
                {
                  id: e.id,
                  titulo: `Excepción ${RESULTADO_PARA_VENTAS[e.estado]}`,
                  detalle: `Cotización ${e.cotizacionId}`,
                  ruta: `/cotizaciones/${e.cotizacionId}`,
                },
              ]
            : [],
        );
      }
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
      case "PMO":
        return [...avisoPorAplicar(porAplicar), ...deObra];
      case "SUPERVISOR_OBRA":
        return deObra;
      case "DIRECCION":
        return [
          ...avisoPorAutorizar(porAutorizar),
          ...deObra,
          ...(badges.cobranza > 0
            ? [
                {
                  id: "cartera",
                  titulo: `${badges.cobranza} cuentas con atraso`,
                  detalle: "Revisa la cartera vencida en Cobranza.",
                  ruta: "/cobranza",
                },
              ]
            : []),
        ];
    }
  }, [rol, aprobaciones, cotizaciones, obra, terrenos, badges.cobranza]);
}
