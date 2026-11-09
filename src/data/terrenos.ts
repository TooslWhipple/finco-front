import {
  diasEntre,
  ETAPAS_TERRENO,
  idPlazaDeTerreno,
  META_CUMPLIMIENTO_DEFECTO,
  sumarDias,
  type Ciudad,
  type Coordenadas,
  type EtapaTerreno,
  type FechaISO,
  type HitoTerreno,
  type Local,
  type Plaza,
  type Terreno,
} from "@/domain";
import { coordenadasPlaza } from "./coordenadas";

const RESPONSABLES = [
  "Ing. Sergio Beltrán",
  "Arq. Lucía Montoya",
  "Ing. Rafael Quintero",
  "Arq. Daniela Ochoa",
];

const TITULOS_HITO = [
  "Compra del predio",
  "Due diligence y dictamen legal",
  "Permisos y licencias",
  "Obra y acabados",
  "Preventa y apertura",
] as const;

/** Hitos cumplidos según la etapa en que va el proyecto. */
function hitosDe(
  id: string,
  etapa: EtapaTerreno,
  inicio: FechaISO,
  objetivo: FechaISO,
): HitoTerreno[] {
  const cumplidos = ETAPAS_TERRENO.indexOf(etapa);
  const paso = diasEntre(inicio, objetivo) / TITULOS_HITO.length;
  return TITULOS_HITO.map((titulo, i) => ({
    id: `${id}-h${i + 1}`,
    titulo,
    fecha: sumarDias(inicio, Math.round(paso * (i + 1))),
    cumplido: i < cumplidos,
  }));
}

/** [inicio, objetivo, avance %] de cada plaza en preventa, en el orden del seed. */
const PREVENTA: ReadonlyArray<readonly [FechaISO, FechaISO, number]> = [
  ["2025-03-10", "2027-01-31", 82],
  ["2025-04-22", "2027-03-15", 74],
  ["2025-02-03", "2026-12-15", 91],
  ["2025-06-16", "2027-04-30", 60],
  ["2025-05-05", "2027-02-26", 79],
  ["2025-08-11", "2027-06-30", 38],
  ["2025-01-20", "2026-11-30", 96],
  ["2025-07-07", "2027-05-14", 64],
];

interface ProyectoPropio {
  nombre: string;
  ciudadId: string;
  etapa: EtapaTerreno;
  inicio: FechaISO;
  objetivo: FechaISO;
  avancePct: number;
  areaM2: number;
  locales: number;
}

/** Proyectos sin plaza todavía: tres en desarrollo 2026 y tres en etapas tempranas. */
const PROPIOS: readonly ProyectoPropio[] = [
  {
    nombre: "Terreno Valle Real",
    ciudadId: "culiacan",
    etapa: "CONSTRUCCION",
    inicio: "2026-02-09",
    objetivo: "2027-08-31",
    avancePct: 38,
    areaM2: 6_200,
    locales: 42,
  },
  {
    nombre: "Terreno Costa Azul",
    ciudadId: "mazatlan",
    etapa: "CONSTRUCCION",
    inicio: "2026-03-23",
    objetivo: "2027-09-15",
    avancePct: 21,
    areaM2: 5_400,
    locales: 36,
  },
  {
    nombre: "Terreno Los Pinos",
    ciudadId: "la-paz",
    etapa: "PERMISOS",
    inicio: "2026-05-18",
    objetivo: "2027-11-30",
    avancePct: 55,
    areaM2: 4_800,
    locales: 30,
  },
  {
    nombre: "Terreno Mirador del Valle",
    ciudadId: "guasave",
    etapa: "DUE_DILIGENCE",
    inicio: "2026-08-03",
    objetivo: "2028-02-29",
    avancePct: 40,
    areaM2: 3_900,
    locales: 24,
  },
  {
    nombre: "Terreno Bahía Sur",
    ciudadId: "ensenada",
    etapa: "DUE_DILIGENCE",
    inicio: "2026-09-14",
    objetivo: "2028-04-28",
    avancePct: 25,
    areaM2: 3_600,
    locales: 22,
  },
  {
    nombre: "Terreno Camino Real",
    ciudadId: "obregon",
    etapa: "PROSPECCION",
    inicio: "2026-10-05",
    objetivo: "2028-09-29",
    avancePct: 10,
    areaM2: 5_000,
    locales: 32,
  },
];

/** Metros del predio por metro rentable: estacionamiento, circulaciones y áreas comunes. */
const FACTOR_PREDIO = 1.8;

/**
 * Terrenos y proyectos: uno por cada plaza en preventa (enlazado a ella, con
 * los locales y m² reales) más seis proyectos propios sin plaza todavía.
 */
export function crearTerrenos(
  plazas: readonly Plaza[],
  locales: readonly Local[],
): Terreno[] {
  const preventa = plazas.filter((p) => p.estatus === "PREVENTA");
  const deCatalogo = preventa.map<Terreno>((plaza, i) => {
    const propios = locales.filter((l) => l.plazaId === plaza.id);
    const [inicio, objetivo, avancePct] = PREVENTA[i % PREVENTA.length];
    const id = `ter-${String(i + 1).padStart(2, "0")}`;
    return {
      id,
      nombre: plaza.nombre,
      ciudadId: plaza.ciudadId,
      plazaId: plaza.id,
      etapa: "PREVENTA",
      avancePct,
      inicioDesarrollo: inicio,
      fechaObjetivo: objetivo,
      responsable: RESPONSABLES[i % RESPONSABLES.length],
      areaM2:
        Math.round((propios.reduce((s, l) => s + l.areaM2, 0) * FACTOR_PREDIO) / 100) *
        100,
      localesProyectados: propios.length,
      hitos: hitosDe(id, "PREVENTA", inicio, objetivo),
    };
  });
  const propios = PROPIOS.map<Terreno>((p, i) => {
    const id = `ter-${String(deCatalogo.length + i + 1).padStart(2, "0")}`;
    return {
      id,
      nombre: p.nombre,
      ciudadId: p.ciudadId,
      etapa: p.etapa,
      avancePct: p.avancePct,
      inicioDesarrollo: p.inicio,
      fechaObjetivo: p.objetivo,
      responsable: RESPONSABLES[(deCatalogo.length + i) % RESPONSABLES.length],
      areaM2: p.areaM2,
      localesProyectados: p.locales,
      hitos: hitosDe(id, p.etapa, p.inicio, p.objetivo),
    };
  });
  return [...deCatalogo, ...propios];
}

/**
 * Plazas del catálogo más las que nacen de un terreno sin plaza propia que
 * llegó a preventa en la demo: así el Mapa y el Panorama las cuentan.
 */
export function plazasConTerrenos(
  plazas: readonly Plaza[],
  terrenos: readonly Terreno[],
  ciudades: readonly Ciudad[],
): Plaza[] {
  const ciudadPorId = new Map(ciudades.map((c) => [c.id, c]));
  const nuevas: Plaza[] = [];
  for (const t of terrenos) {
    const ciudad = ciudadPorId.get(t.ciudadId);
    if (t.plazaId || t.etapa !== "PREVENTA" || !ciudad) continue;
    const id = idPlazaDeTerreno(t.id);
    nuevas.push({
      id,
      nombre: t.nombre,
      ciudadId: t.ciudadId,
      estatus: "PREVENTA",
      coordenadas: coordenadasPlaza(ciudad, id),
      metaCumplimientoPct: META_CUMPLIMIENTO_DEFECTO,
    });
  }
  return nuevas.length === 0 ? [...plazas] : [...plazas, ...nuevas];
}

/** Ubicación en el mapa: la de su plaza, o una ficticia estable si aún no la tiene. */
export function coordenadasTerreno(
  terreno: Terreno,
  ciudad: Ciudad,
  plazas: readonly Plaza[],
): Coordenadas {
  const plaza = plazas.find((p) => p.id === terreno.plazaId);
  return plaza?.coordenadas ?? coordenadasPlaza(ciudad, idPlazaDeTerreno(terreno.id));
}
