import type { Celda, ColumnaTabla, TablaReporte } from "./tipos";

const SUFIJO: Readonly<Record<NonNullable<ColumnaTabla["formato"]>, string>> = {
  numero: "",
  moneda: " (MXN)",
  porcentaje: " (%)",
};

function escapar(valor: Celda): string {
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

function valorCsv(valor: Celda | undefined, columna: ColumnaTabla): Celda {
  if (valor === undefined) return "";
  // Los porcentajes viajan como fracción; en el archivo van en puntos (0.853 → 85.3).
  return columna.formato === "porcentaje" && typeof valor === "number"
    ? Math.round(valor * 1000) / 10
    : valor;
}

/** CSV de la tabla: cabecera con unidades, valores crudos (sin separador de miles ni símbolo). */
export function tablaACsv(tabla: TablaReporte): string {
  const cabecera = tabla.columnas.map((c) =>
    escapar(`${c.etiqueta}${c.formato ? SUFIJO[c.formato] : ""}`),
  );
  const filas = tabla.filas.map((fila) =>
    tabla.columnas.map((c) => escapar(valorCsv(fila[c.clave], c))).join(","),
  );
  return [cabecera.join(","), ...filas].join("\n");
}
