import type { EtapaProspecto, OrigenProspecto, Prospecto } from "./tipos";

/** Etapas del embudo en orden; `PERDIDO` queda fuera del avance. */
export const ETAPAS_PROSPECTO: readonly EtapaProspecto[] = [
  "NUEVO",
  "CONTACTADO",
  "VISITA",
  "COTIZADO",
  "GANADO",
  "PERDIDO",
];

export const ETIQUETA_ETAPA_PROSPECTO: Readonly<Record<EtapaProspecto, string>> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  VISITA: "Visita",
  COTIZADO: "Cotizado",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
};

export const ETIQUETA_ORIGEN_PROSPECTO: Readonly<Record<OrigenProspecto, string>> = {
  REFERIDO: "Referido",
  SITIO_WEB: "Sitio web",
  LLAMADA: "Llamada",
  REDES: "Redes sociales",
  BROKER: "Broker",
  EVENTO: "Evento",
};

export const ORIGENES_PROSPECTO = Object.keys(
  ETIQUETA_ORIGEN_PROSPECTO,
) as readonly OrigenProspecto[];

/** Un prospecto sigue vivo mientras no se gane ni se pierda. */
export function prospectoActivo(prospecto: Prospecto): boolean {
  return prospecto.etapa !== "GANADO" && prospecto.etapa !== "PERDIDO";
}

/** Etapa a la que avanza un prospecto vivo; `null` si ya se ganó o se perdió. */
export function siguienteEtapaProspecto(etapa: EtapaProspecto): EtapaProspecto | null {
  if (etapa === "GANADO" || etapa === "PERDIDO") return null;
  return ETAPAS_PROSPECTO[ETAPAS_PROSPECTO.indexOf(etapa) + 1] ?? null;
}

export interface PasoEmbudo {
  etapa: EtapaProspecto;
  cantidad: number;
  /** Fracción respecto del total de prospectos (0-1). */
  proporcion: number;
}

/** Cuántos prospectos hay en cada etapa, en el orden del embudo (con ceros). */
export function embudoProspectos(prospectos: readonly Prospecto[]): PasoEmbudo[] {
  const total = prospectos.length;
  return ETAPAS_PROSPECTO.map((etapa) => {
    const cantidad = prospectos.filter((p) => p.etapa === etapa).length;
    return { etapa, cantidad, proporcion: total === 0 ? 0 : cantidad / total };
  });
}

/** Prospectos activos con interés en cada local (solo aparecen los locales con alguno). */
export function prospectosPorLocal(
  prospectos: readonly Prospecto[],
): Map<string, Prospecto[]> {
  const porLocal = new Map<string, Prospecto[]>();
  for (const prospecto of prospectos.filter(prospectoActivo)) {
    for (const localId of prospecto.localIds) {
      const lista = porLocal.get(localId);
      if (lista) lista.push(prospecto);
      else porLocal.set(localId, [prospecto]);
    }
  }
  return porLocal;
}

/** Id (`pro-NNN`) del siguiente prospecto: continúa tras el mayor existente. */
export function siguienteIdProspecto(prospectos: readonly Prospecto[]): string {
  const mayor = prospectos.reduce((max, p) => {
    const numero = Number(p.id.replace(/^pro-/, ""));
    return Number.isFinite(numero) ? Math.max(max, numero) : max;
  }, 0);
  return `pro-${String(mayor + 1).padStart(3, "0")}`;
}
