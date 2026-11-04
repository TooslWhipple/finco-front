const LOCALE = "es-MX";

const moneda = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numero = new Intl.NumberFormat(LOCALE);

const porcentaje = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Moneda MXN sin decimales: $18,740. */
export function formatMoneda(valor: number): string {
  return moneda.format(valor);
}

/** Entero con separador de miles: 1,234. */
export function formatNumero(valor: number): string {
  return numero.format(valor);
}

/** Recibe una fracción (0.052) y devuelve "5.2%". */
export function formatPorcentaje(fraccion: number): string {
  return porcentaje.format(fraccion);
}

const puntos = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Recibe un porcentaje ya en puntos (4.64) y devuelve "4.64%"; evita el ruido de flotantes. */
export function formatPuntos(valor: number): string {
  return `${puntos.format(valor)}%`;
}

/** Como `formatPuntos` pero con signo explícito: "+4.64%" / "-1.2%". */
export function formatPuntosConSigno(valor: number): string {
  return `${valor > 0 ? "+" : ""}${formatPuntos(valor)}`;
}

function aFecha(valor: Date | string): Date {
  return typeof valor === "string" ? new Date(`${valor}T12:00:00`) : valor;
}

/** Fecha corta: "3 nov 2026". Los strings ISO (YYYY-MM-DD) se leen en hora local. */
export function formatFecha(valor: Date | string): string {
  return aFecha(valor)
    .toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" })
    .replace(/\./g, "");
}

/** Fecha larga: "martes, 3 de noviembre de 2026". */
export function formatFechaLarga(valor: Date | string): string {
  return aFecha(valor).toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Día y mes: "02 nov". */
export function formatDiaMes(valor: Date | string): string {
  return aFecha(valor)
    .toLocaleDateString(LOCALE, { day: "2-digit", month: "short" })
    .replace(/\./g, "")
    .replace(/-/g, " ");
}

/** Mes corto: "sep". */
export function formatMesCorto(valor: Date | string): string {
  return aFecha(valor).toLocaleDateString(LOCALE, { month: "short" }).replace(/\./g, "");
}

const millones = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Moneda abreviada a millones: $18.4 M. */
export function formatMonedaMillones(valor: number): string {
  return `$${millones.format(valor / 1_000_000)} M`;
}

/** Mes y año: "ene 2027". */
export function formatMesAnio(valor: Date | string): string {
  return aFecha(valor)
    .toLocaleDateString(LOCALE, { month: "short", year: "numeric" })
    .replace(/\./g, "");
}
