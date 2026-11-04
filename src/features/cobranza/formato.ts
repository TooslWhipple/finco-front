const millones = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Moneda abreviada a millones con dos decimales, como en la guía: $19.86 M. */
export function formatMillones(valor: number): string {
  return `$${millones.format(valor / 1_000_000)} M`;
}
