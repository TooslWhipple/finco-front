/** Redondea a dos decimales (centavos), con el medio hacia arriba de `Math.round`. */
export function redondearCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}
