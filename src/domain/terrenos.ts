import { diasEntre } from "./fechas";
import type { EtapaTerreno, FechaISO, SemaforoTerreno, Terreno } from "./tipos";

/** Etapas del desarrollo, en orden. */
export const ETAPAS_TERRENO: readonly EtapaTerreno[] = [
  "PROSPECCION",
  "DUE_DILIGENCE",
  "PERMISOS",
  "CONSTRUCCION",
  "PREVENTA",
  "ABIERTO",
];

/** Puntos de avance por debajo de lo esperado que aún se toleran en verde. */
const HOLGURA_VERDE = 10;
/** Más allá de esta brecha el proyecto está en rojo. */
const HOLGURA_AMARILLO = 25;

/** Avance esperado (0-100) según el tiempo transcurrido entre inicio y fecha objetivo. */
export function avanceEsperado(terreno: Terreno, hoy: FechaISO): number {
  const total = diasEntre(terreno.inicioDesarrollo, terreno.fechaObjetivo);
  if (total <= 0) return 100;
  const corrido = diasEntre(terreno.inicioDesarrollo, hoy);
  return Math.min(100, Math.max(0, (corrido / total) * 100));
}

/**
 * Semáforo del proyecto: el derivado del valor ganado si tiene obra; si no, el
 * avance contra lo esperado a la fecha. Un proyecto abierto está en verde; uno con la fecha objetivo vencida y sin terminar, en rojo.
 */
export function semaforoTerreno(terreno: Terreno, hoy: FechaISO): SemaforoTerreno {
  if (terreno.semaforoObra) return terreno.semaforoObra;
  if (terreno.etapa === "ABIERTO") return "VERDE";
  if (terreno.avancePct < 100 && terreno.fechaObjetivo < hoy) return "ROJO";
  const brecha = avanceEsperado(terreno, hoy) - terreno.avancePct;
  if (brecha <= HOLGURA_VERDE) return "VERDE";
  return brecha <= HOLGURA_AMARILLO ? "AMARILLO" : "ROJO";
}

const ETAPAS_EN_DESARROLLO: readonly EtapaTerreno[] = ["PERMISOS", "CONSTRUCCION"];

/** Proyectos en permisos o construcción que arrancaron su desarrollo en `año`. */
export function enDesarrolloEn(terrenos: readonly Terreno[], año: number): Terreno[] {
  return terrenos.filter(
    (t) =>
      ETAPAS_EN_DESARROLLO.includes(t.etapa) &&
      Number(t.inicioDesarrollo.slice(0, 4)) === año,
  );
}

export const ETIQUETA_ETAPA_TERRENO: Readonly<Record<EtapaTerreno, string>> = {
  PROSPECCION: "Prospección",
  DUE_DILIGENCE: "Due diligence",
  PERMISOS: "Permisos",
  CONSTRUCCION: "Construcción",
  PREVENTA: "Preventa",
  ABIERTO: "Abierto",
};

export const ETIQUETA_SEMAFORO_TERRENO: Readonly<Record<SemaforoTerreno, string>> = {
  VERDE: "En tiempo",
  AMARILLO: "Con retraso",
  ROJO: "En riesgo",
};

const PREFIJO_TERRENO = "ter-";
const PREFIJO_PLAZA_DE_TERRENO = `plz-${PREFIJO_TERRENO}`;

/** Id de la plaza que un terreno sin plaza propia genera en preventa. */
export function idPlazaDeTerreno(terrenoId: string): string {
  return `plz-${terrenoId}`;
}

/** La plaza viene de un terreno (no existe en el catálogo ni tiene ficha propia). */
export function esPlazaDeTerreno(plazaId: string): boolean {
  return plazaId.startsWith(PREFIJO_PLAZA_DE_TERRENO);
}

/** Destino al abrir una plaza: su ficha, o el terreno si todavía no tiene ficha. */
export function rutaPlaza(plazaId: string): string {
  return esPlazaDeTerreno(plazaId)
    ? `/terrenos-y-proyectos?terreno=${plazaId.slice(PREFIJO_PLAZA_DE_TERRENO.length - PREFIJO_TERRENO.length)}`
    : `/plazas/${plazaId}`;
}
