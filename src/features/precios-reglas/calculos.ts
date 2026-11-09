/** Rango admitido para la meta de cumplimiento del plan, en %. */
export const META_MIN_PCT = 50;
export const META_MAX_PCT = 120;

/** Valida el texto capturado de la meta; devuelve el número o el mensaje de error. */
export function validarMeta(texto: string): number | string {
  const valor = Number(texto.trim().replace(",", "."));
  if (texto.trim() === "" || !Number.isFinite(valor)) {
    return "Captura la meta como un porcentaje, por ejemplo 98.";
  }
  if (valor < META_MIN_PCT || valor > META_MAX_PCT) {
    return `La meta debe estar entre ${META_MIN_PCT}% y ${META_MAX_PCT}%.`;
  }
  return Math.round(valor * 10) / 10;
}
