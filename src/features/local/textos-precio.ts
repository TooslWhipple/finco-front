/**
 * Etiquetas y ayudas de los tres montos que se confunden con facilidad: lista,
 * mínimo y renta contratada. Un solo lugar para que todas las pantallas digan
 * lo mismo.
 */
export const TEXTOS_PRECIO = {
  lista: {
    etiqueta: "Precio de lista",
    ayuda: "Precio al que se ofrece hoy; se actualiza con la regla anual",
  },
  minimo: {
    etiqueta: "Precio mínimo autorizado (PMO)",
    ayuda: "Piso definido por la PMO; debajo solo con autorización de Dirección",
  },
  renta: {
    etiqueta: "Renta contratada",
    ayuda: "Lo que paga hoy el locatario",
  },
} as const;
