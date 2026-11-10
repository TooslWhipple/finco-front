import type { ComponentType } from "react";
import type { ContextoExpediente } from "./contexto";
import { PestanaContratos } from "./pestana-contratos";
import { PestanaCortes } from "./pestana-cortes";
import { PestanaEstimaciones } from "./pestana-estimaciones";
import { PestanaCronograma } from "./pestana-cronograma";
import { PestanaLicitaciones } from "./licitaciones/pestana-licitaciones";
import { PestanaValorGanado } from "./pestana-valor-ganado";
import { PestanaResumen } from "./pestana-resumen";

export interface PestanaExpediente {
  id: string;
  etiqueta: string;
  /** La pestaña solo aparece si el contexto lo permite (datos de obra, rol). */
  visible: (contexto: ContextoExpediente) => boolean;
  Componente: ComponentType<ContextoExpediente>;
}

export const PESTANA_LICITACIONES = "licitaciones";

/** Pestañas del expediente, en orden. Sumar una nueva es agregar un elemento. */
export const PESTANAS: readonly PestanaExpediente[] = [
  { id: "resumen", etiqueta: "Resumen", visible: () => true, Componente: PestanaResumen },
  {
    id: "cronograma",
    etiqueta: "Cronograma",
    visible: () => true,
    Componente: PestanaCronograma,
  },
  {
    id: "contratos",
    etiqueta: "Contratos de obra",
    visible: (c) => c.contratos.length > 0,
    Componente: PestanaContratos,
  },
  {
    id: "cortes",
    etiqueta: "Cortes",
    visible: (c) => c.contratos.length > 0,
    Componente: PestanaCortes,
  },
  {
    id: "estimaciones",
    etiqueta: "Estimaciones",
    visible: (c) => c.contratos.length > 0,
    Componente: PestanaEstimaciones,
  },
  {
    id: "valor-ganado",
    etiqueta: "Valor ganado",
    visible: (c) => c.contratos.length > 0,
    Componente: PestanaValorGanado,
  },
  {
    id: PESTANA_LICITACIONES,
    etiqueta: "Licitaciones",
    visible: (c) => c.licitaciones.length > 0,
    Componente: PestanaLicitaciones,
  },
];
