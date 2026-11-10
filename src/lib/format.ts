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

const indice = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Índice de desempeño (SPI, CPI) con dos decimales: 0.88. */
export function formatIndice(valor: number): string {
  return indice.format(valor);
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

const UNIDADES = [
  "cero",
  "un",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiún",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
] as const;
const DECENAS = [
  "",
  "",
  "",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
] as const;
const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
] as const;

/** Entero de 1 a 999 en letra, con apócope ("un") porque siempre precede a un sustantivo. */
function centenasEnLetra(n: number): string {
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 30) partes.push(UNIDADES[resto]);
    else {
      const u = resto % 10;
      partes.push(
        u === 0
          ? DECENAS[resto / 10]
          : `${DECENAS[Math.floor(resto / 10)]} y ${UNIDADES[u]}`,
      );
    }
  }
  return partes.join(" ");
}

function enteroEnLetra(n: number): string {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0)
    partes.push(millones === 1 ? "un millón" : `${centenasEnLetra(millones)} millones`);
  if (miles > 0) partes.push(miles === 1 ? "mil" : `${centenasEnLetra(miles)} mil`);
  if (resto > 0) partes.push(centenasEnLetra(resto));
  return partes.join(" ");
}

/**
 * Monto en letra al estilo de los contratos mexicanos:
 * 18740 -> "dieciocho mil setecientos cuarenta pesos 00/100 M.N.". Admite hasta 999,999,999.
 */
export function montoEnLetra(monto: number): string {
  const centavosTotales = Math.round(monto * 100);
  const pesos = Math.floor(centavosTotales / 100);
  const centavos = String(centavosTotales % 100).padStart(2, "0");
  const sustantivo =
    pesos === 1 ? "peso" : pesos % 1_000_000 === 0 && pesos > 0 ? "de pesos" : "pesos";
  return `${enteroEnLetra(pesos)} ${sustantivo} ${centavos}/100 M.N.`;
}
