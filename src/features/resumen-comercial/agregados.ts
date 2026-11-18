import { IDS_VENDEDORES } from "@/config/usuarios";
import {
  diasEntre,
  diasSinContacto,
  embudoProspectos,
  fechaUltimoHecho,
  localesSinAbrir,
  sobregirosPendientes,
  temperaturaProspecto,
  type FechaISO,
  type Mantenimiento,
  type PasoEmbudo,
  type Prospecto,
} from "@/domain";
import { kpisCobranza } from "@/features/cobranza/calculos";
import { kpisMapa, resumirPlazasMapa } from "@/features/mapa/agregados";
import { cumplimientoGlobal } from "@/features/reportes/calculos-rentas";
import type { DatosReporte } from "@/features/reportes/tipos";
import { MES_DEMO } from "@/lib/tiempo";

/** KPIs del inicio gerencial de Comercial, con las mismas funciones que las pantallas de detalle. */
export interface ResumenComercial {
  /** Plazas en operación (las de preventa no entran a los KPIs). */
  plazas: number;
  enPreventa: number;
  /** Fracción 0-1 de locales rentados sobre los de las plazas en operación. */
  ocupacion: number;
  localesSinAbrir: number;
  /** Fracción 0-1: Σ contratada / Σ planeada de las plazas en operación con plan. */
  cumplimiento: number;
  carteraVencida: number;
  sobregirosPendientes: number;
}

export function resumenComercial(
  datos: DatosReporte,
  mantenimientos: readonly Mantenimiento[],
): ResumenComercial {
  const mapa = kpisMapa(resumirPlazasMapa(datos.ciudades, datos.plazas, datos.locales));
  return {
    plazas: mapa.plazas - mapa.enPreventa,
    enPreventa: mapa.enPreventa,
    ocupacion: mapa.ocupacionPromedio,
    localesSinAbrir: localesSinAbrir(datos.locales, datos.contratos, datos.hoy).length,
    cumplimiento: cumplimientoGlobal(datos),
    carteraVencida: kpisCobranza([...datos.facturas], MES_DEMO, datos.hoy).carteraVencida,
    sobregirosPendientes: sobregirosPendientes(mantenimientos).length,
  };
}

/** Ventana de "ganados recientes" del avance del equipo. */
export const DIAS_GANADOS_RECIENTES = 30;

/** Avance de un vendedor en el embudo (o de "Otros": quienes no son vendedores). */
export interface FilaAvanceEquipo {
  /** Vendedor (`Usuario.id`); `null` en la fila "Otros". */
  usuarioId: string | null;
  /** Embudo de sus prospectos, solo en las etapas activas (sin Ganado ni Perdido). */
  porEtapa: PasoEmbudo[];
  /** Activos con 30 días o más sin contacto. */
  frios: number;
  /** Ganados cuyo último hecho cae en los últimos 30 días hasta `hoy`. */
  ganados30d: number;
}

function filaAvance(
  usuarioId: string | null,
  prospectos: readonly Prospecto[],
  hoy: FechaISO,
): FilaAvanceEquipo {
  return {
    usuarioId,
    porEtapa: embudoProspectos(prospectos).filter(
      (paso) => paso.etapa !== "GANADO" && paso.etapa !== "PERDIDO",
    ),
    frios: prospectos.filter(
      (p) => temperaturaProspecto(diasSinContacto(p, hoy)) === "FRIO",
    ).length,
    ganados30d: prospectos.filter((p) => {
      if (p.etapa !== "GANADO") return false;
      const dias = diasEntre(fechaUltimoHecho(p), hoy);
      return dias >= 0 && dias < DIAS_GANADOS_RECIENTES;
    }).length,
  };
}

/**
 * Avance del equipo comercial: una fila por vendedor de `IDS_VENDEDORES` y, al
 * final, "Otros" si hay prospectos de usuarios que no son vendedores (por
 * ejemplo, un alta de Dirección).
 */
export function avanceEquipo(
  prospectos: readonly Prospecto[],
  hoy: FechaISO,
): FilaAvanceEquipo[] {
  const filas = IDS_VENDEDORES.map((id) =>
    filaAvance(
      id,
      prospectos.filter((p) => p.vendedorId === id),
      hoy,
    ),
  );
  const otros = prospectos.filter((p) => !IDS_VENDEDORES.includes(p.vendedorId));
  return otros.length > 0 ? [...filas, filaAvance(null, otros, hoy)] : filas;
}
