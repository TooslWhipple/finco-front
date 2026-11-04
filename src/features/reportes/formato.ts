import { formatMoneda, formatNumero, formatPorcentaje } from "@/lib/format";
import type { Celda, FormatoValor } from "./tipos";

/** Texto de un valor según el formato de su columna o serie. */
export function formatearValor(valor: Celda, formato?: FormatoValor): string {
  if (typeof valor !== "number" || !formato) return String(valor);
  switch (formato) {
    case "moneda":
      return formatMoneda(valor);
    case "porcentaje":
      return formatPorcentaje(valor);
    case "numero":
      return formatNumero(valor);
  }
}
