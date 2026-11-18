import {
  campanaVigente,
  type AtribucionContratos,
  type Campana,
  type Contrato,
  type Prospecto,
} from "@/domain";
import { crearPrng } from "./prng";
import { vendedorDeIndice } from "./vendedores";

/** PRNG de la asignación de campañas a prospectos; no toca el de prospectos. */
export const SEMILLA_CAMPANAS = 5_201;
/**
 * PRNG de la atribución de contratos, aparte del de campañas: un cambio en los
 * prospectos no altera qué contratos se atribuyen (ni las comisiones que salen de ahí).
 */
export const SEMILLA_ATRIBUCION = 5_202;
/** Contratos de 2026 que reciben atribución demo. */
export const CONTRATOS_ATRIBUIDOS = 15;
const AÑO_ATRIBUCION = "2026";

/** Campañas simuladas de 2026. */
export const CAMPANAS_SEED: readonly Campana[] = [
  {
    id: "cmp-01",
    nombre: "Facebook Ads · Locales Culiacán",
    canal: "REDES",
    inicio: "2026-01-01",
    fin: "2026-12-31",
    inversion: 180_000,
  },
  {
    id: "cmp-02",
    nombre: "Google Ads · Plazas Sinaloa",
    canal: "SITIO_WEB",
    inicio: "2026-01-01",
    fin: "2026-12-31",
    inversion: 240_000,
  },
  {
    id: "cmp-03",
    nombre: "Instagram · Preventa",
    canal: "REDES",
    inicio: "2026-05-01",
    fin: "2026-10-31",
    inversion: 95_000,
  },
  {
    id: "cmp-04",
    nombre: "Portal inmobiliario",
    canal: "SITIO_WEB",
    inicio: "2026-03-01",
    fin: "2026-09-30",
    inversion: 120_000,
  },
  {
    id: "cmp-05",
    nombre: "Volanteo Plaza Aurora",
    canal: "LLAMADA",
    inicio: "2026-02-01",
    fin: "2026-04-30",
    inversion: 35_000,
  },
  {
    id: "cmp-06",
    nombre: "Expo Franquicias",
    canal: "EVENTO",
    inicio: "2026-06-10",
    fin: "2026-06-14",
    inversion: 60_000,
  },
];

/** Orígenes digitales cuyos prospectos del seed llegan de una campaña. */
const ORIGENES_CON_CAMPANA: ReadonlySet<Prospecto["origen"]> = new Set(["REDES", "SITIO_WEB"]);

/**
 * Liga a cada prospecto REDES o SITIO_WEB una campaña de su mismo canal que
 * estuviera vigente el día de su alta (al azar entre las que cumplan); si
 * ninguna cumple, queda sin campaña. Los demás orígenes no llevan campaña.
 */
export function asignarCampanas(
  prospectos: readonly Prospecto[],
  campanas: readonly Campana[],
): Prospecto[] {
  const rng = crearPrng(SEMILLA_CAMPANAS);
  return prospectos.map((p) => {
    if (!ORIGENES_CON_CAMPANA.has(p.origen)) return p;
    const candidatas = campanas.filter(
      (c) => c.canal === p.origen && campanaVigente(c, p.creadoEl),
    );
    if (candidatas.length === 0) return p;
    return { ...p, campanaId: rng.elegir(candidatas).id };
  });
}

/**
 * Atribución demo de exactamente `CONTRATOS_ATRIBUIDOS` contratos de 2026: los
 * contratos históricos no nacieron de una cotización con prospecto, así que sin
 * ella las campañas mostrarían 0 contratos.
 * - El contrato de cada prospecto GANADO con campaña (el más reciente de su
 *   local) va a la campaña de su prospecto, sin exigirle vigencia.
 * - El resto se elige al azar y va a una campaña vigente en su inicio.
 * - Solo campañas con prospectos y nunca más contratos que prospectos tiene la
 *   campaña (así la conversión no pasa de 1); sin cupo queda sin campaña.
 * - El vendedor sale del reparto fijo `vendedorDeIndice`, en el orden de `contratos`.
 */
export function atribuirContratos(
  contratos: readonly Contrato[],
  prospectos: readonly Prospecto[],
  campanas: readonly Campana[],
): AtribucionContratos {
  const rng = crearPrng(SEMILLA_ATRIBUCION);
  const del2026 = contratos.filter((c) => c.inicio.startsWith(AÑO_ATRIBUCION));

  const cupo = new Map<string, number>();
  for (const p of prospectos) {
    if (p.campanaId !== undefined) cupo.set(p.campanaId, (cupo.get(p.campanaId) ?? 0) + 1);
  }
  const campanaDe = new Map<string, string>();
  const asignar = (contratoId: string, campanaId: string) => {
    campanaDe.set(contratoId, campanaId);
    cupo.set(campanaId, (cupo.get(campanaId) ?? 0) - 1);
  };

  const elegidos = new Set<string>();
  for (const p of prospectos) {
    if (p.etapa !== "GANADO" || p.campanaId === undefined) continue;
    const reciente = contratos
      .filter((c) => p.localIds.includes(c.localId))
      .reduce<Contrato | undefined>(
        (max, c) => (max === undefined || c.inicio > max.inicio ? c : max),
        undefined,
      );
    if (
      reciente === undefined ||
      !reciente.inicio.startsWith(AÑO_ATRIBUCION) ||
      elegidos.has(reciente.id) ||
      elegidos.size >= CONTRATOS_ATRIBUIDOS
    ) {
      continue;
    }
    elegidos.add(reciente.id);
    asignar(reciente.id, p.campanaId);
  }

  const resto = rng
    .barajar(del2026.filter((c) => !elegidos.has(c.id)))
    .slice(0, CONTRATOS_ATRIBUIDOS - elegidos.size);
  for (const contrato of resto) {
    elegidos.add(contrato.id);
    const candidatas = campanas.filter(
      (c) => (cupo.get(c.id) ?? 0) > 0 && campanaVigente(c, contrato.inicio),
    );
    if (candidatas.length > 0) asignar(contrato.id, rng.elegir(candidatas).id);
  }

  const atribucion: AtribucionContratos = {};
  del2026
    .filter((c) => elegidos.has(c.id))
    .forEach((c, i) => {
      const campanaId = campanaDe.get(c.id);
      atribucion[c.id] = {
        vendedorId: vendedorDeIndice(i),
        ...(campanaId === undefined ? {} : { campanaId }),
      };
    });
  return atribucion;
}
