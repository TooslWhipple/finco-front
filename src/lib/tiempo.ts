import { DEMO_TODAY } from "@/domain";

/** "Ahora" fijo de la demo: el martes de `DEMO_TODAY` a las 15:56. */
export const AHORA_DEMO = `${DEMO_TODAY}T15:56:00`;

/** Tiempo transcurrido en lenguaje natural: "hace 14 min", "hace 2 h". */
export function haceCuanto(iso: string, ahora: string = AHORA_DEMO): string {
  const minutos = Math.floor((Date.parse(ahora) - Date.parse(iso)) / 60_000);
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}

/** Saludo según la hora de "ahora" de la demo. */
export function saludoPorHora(ahora: string = AHORA_DEMO): string {
  const hora = new Date(ahora).getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Mes de "hoy" (`YYYY-MM`): el corte de cobranza vigente de la demo. */
export const MES_DEMO = DEMO_TODAY.slice(0, 7);
