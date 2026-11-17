import { usuarioDeRol } from "@/config/usuarios";
import {
  conCatalogo,
  DEMO_TODAY,
  montoContrato,
  sumarDias,
  type ConceptoLicitacion,
  type ContratoObra,
  type DescarteLicitacion,
  type FechaISO,
  type Licitacion,
  type PartidaObra,
  type PropuestaRonda,
  type Proveedor,
  type RondaLicitacion,
} from "@/domain";
import { PROVEEDORES } from "./catalogo";
import { ID_TERRENO_HEROE } from "./obra";

/** Cómo se condujo la licitación de una partida del héroe. */
interface SpecLicitacion {
  invitados: number;
  /** Cuántos respondieron la primera ronda (incluye al ganador). */
  respondieron: number;
  rondas: number;
  /** Cuánto se separa el presupuesto base de lo adjudicado (negativo: lo adjudicado quedó arriba del base). */
  sobreBase: number;
  /** Cuánto bajó el ganador entre su primera propuesta y la adjudicada. */
  bajaGanador: number;
}

const SPECS: Readonly<Partial<Record<PartidaObra, SpecLicitacion>>> = {
  TERRACERIAS: {
    invitados: 6,
    respondieron: 3,
    rondas: 2,
    sobreBase: 0.05,
    bajaGanador: 0.06,
  },
  CIMENTACION: {
    invitados: 8,
    respondieron: 4,
    rondas: 3,
    sobreBase: 0.06,
    bajaGanador: 0.09,
  },
  MUROS: { invitados: 10, respondieron: 3, rondas: 3, sobreBase: 0.07, bajaGanador: 0.1 },
  INST_HIDRAULICAS: {
    invitados: 7,
    respondieron: 3,
    rondas: 2,
    sobreBase: 0.04,
    bajaGanador: 0.05,
  },
  INST_ELECTRICAS: {
    invitados: 7,
    respondieron: 4,
    rondas: 3,
    sobreBase: -0.02,
    bajaGanador: 0.07,
  },
  TECHOS: {
    invitados: 8,
    respondieron: 4,
    rondas: 2,
    sobreBase: 0.06,
    bajaGanador: 0.08,
  },
};

/** Sobreprecio de cada competidor perdedor sobre lo adjudicado en la última ronda. */
const SOBREPRECIO_PERDEDORES: readonly number[] = [0.025, 0.045, 0.07];

/** Cuánto sobra su primera propuesta respecto de la última, por competidor. */
const HOLGURA_INICIAL: readonly number[] = [0.11, 0.13, 0.15];

const MOTIVOS_DESCARTE: readonly string[] = [
  "Oferta muy por encima del presupuesto base.",
  "Sin disposición de mejorar su propuesta en la segunda ronda.",
  "No acreditó experiencia en obras de este tamaño.",
];

/** Contratistas de obra del padrón (los que licitan partidas), en el orden del catálogo. */
const CONTRATISTAS_OBRA = PROVEEDORES.filter((p) => p.partidasObra.length > 0);

/** El padrón por id: el ganador de cada contrato se resuelve por `proveedorId`. */
const PROVEEDOR_POR_ID: ReadonlyMap<string, Proveedor> = new Map(
  PROVEEDORES.map((p) => [p.id, p]),
);

/** Los invitados priorizan al ganador y a quienes tienen la especialidad; el resto completa la lista. */
function elegirInvitados(
  partida: PartidaObra,
  ganador: Proveedor,
  cuantos: number,
): Proveedor[] {
  const otros = CONTRATISTAS_OBRA.filter((p) => p.id !== ganador.id);
  const afines = otros.filter((p) => p.partidasObra.includes(partida));
  const resto = otros.filter((p) => !p.partidasObra.includes(partida));
  const elegidos = [ganador, ...afines, ...resto].slice(0, cuantos);
  return CONTRATISTAS_OBRA.filter((p) => elegidos.some((e) => e.id === p.id));
}

function redondear(monto: number): number {
  return Math.round(monto);
}

function licitacionAdjudicada(
  contrato: ContratoObra,
  spec: SpecLicitacion,
  consecutivo: number,
): Licitacion | undefined {
  const ganador = contrato.proveedorId
    ? PROVEEDOR_POR_ID.get(contrato.proveedorId)
    : undefined;
  if (!ganador) return undefined;
  const adjudicado = montoContrato(contrato);
  const invitados = elegirInvitados(contrato.partida, ganador, spec.invitados);
  const perdedores = invitados.filter((p) => p.id !== ganador.id);
  const respondieron = [ganador, ...perdedores.slice(0, spec.respondieron - 1)];

  const ancla: FechaISO =
    contrato.inicioPlan < DEMO_TODAY ? contrato.inicioPlan : DEMO_TODAY;
  const fechaRonda = (n: number): FechaISO =>
    sumarDias(ancla, -(14 * (spec.rondas - n) + 21));

  // Quedan en competencia en cada ronda; tras la ronda 1 sale el de mayor oferta y,
  // si hay una tercera ronda con 4 o más participantes, otro tras la 2.
  const descartados: DescarteLicitacion[] = [];
  let activos = respondieron;
  const rondas: RondaLicitacion[] = [];
  for (let n = 1; n <= spec.rondas; n += 1) {
    const avance = (spec.rondas - n) / (spec.rondas - 1);
    const propuestas: PropuestaRonda[] = [];
    if (n === 1) {
      for (const p of invitados) {
        const idx = perdedores.findIndex((x) => x.id === p.id);
        if (p.id === ganador.id) {
          propuestas.push({
            proveedorId: p.id,
            respondio: true,
            monto: redondear(adjudicado * (1 + spec.bajaGanador)),
          });
        } else if (idx >= 0 && idx < spec.respondieron - 1) {
          propuestas.push({
            proveedorId: p.id,
            respondio: true,
            monto: redondear(adjudicado * (1 + HOLGURA_INICIAL[idx])),
          });
        } else {
          propuestas.push({ proveedorId: p.id, respondio: false });
        }
      }
    } else {
      for (const p of activos) {
        if (n === spec.rondas && p.id === ganador.id) {
          propuestas.push({ proveedorId: p.id, respondio: true, monto: adjudicado });
        } else if (p.id === ganador.id) {
          propuestas.push({
            proveedorId: p.id,
            respondio: true,
            monto: redondear(adjudicado * (1 + spec.bajaGanador * avance)),
          });
        } else {
          const idx = perdedores.findIndex((x) => x.id === p.id);
          const final = SOBREPRECIO_PERDEDORES[idx];
          const inicial = HOLGURA_INICIAL[idx];
          propuestas.push({
            proveedorId: p.id,
            respondio: true,
            monto: redondear(adjudicado * (1 + final + (inicial - final) * avance)),
          });
        }
      }
    }
    rondas.push({ numero: n, fecha: fechaRonda(n), propuestas });

    const puedeDescartar = n < spec.rondas && activos.length > 2;
    if (puedeDescartar) {
      // Sale el perdedor de mayor oferta de la ronda.
      const salida = [...activos]
        .filter((p) => p.id !== ganador.id)
        .sort((a, b) => perdedores.indexOf(b) - perdedores.indexOf(a))[0];
      descartados.push({
        proveedorId: salida.id,
        ronda: n,
        motivo: MOTIVOS_DESCARTE[descartados.length % MOTIVOS_DESCARTE.length],
      });
      activos = activos.filter((p) => p.id !== salida.id);
    }
  }

  const numero = String(consecutivo).padStart(2, "0");
  return {
    id: `${contrato.terrenoId}-lic-${numero}`,
    folio: `LIC-${contrato.folio.split("-")[1]}-${numero}`,
    terrenoId: contrato.terrenoId,
    partida: contrato.partida,
    presupuestoBase: redondear(adjudicado * (1 + spec.sobreBase)),
    invitados: invitados.map((p) => p.id),
    descartados,
    rondas,
    estado: "ADJUDICADA",
    ganadorId: ganador.id,
    montoAdjudicado: adjudicado,
    motivoSeleccion:
      "Mejor precio de la última ronda con experiencia comprobada y plazo que cumple el cronograma.",
    adjudicadaPor: usuarioDeRol("PMO").nombre,
    adjudicadaEn: sumarDias(ancla, -10),
    contratoObraId: contrato.id,
    conceptos: [],
    invitaciones: [],
  };
}

/**
 * Catálogo de acabados de la plaza (volúmenes de proyecto). Con precios
 * unitarios de mercado suma alrededor de 6.4 M, la escala del presupuesto base.
 */
const CATALOGO_ACABADOS: readonly Omit<ConceptoLicitacion, "id">[] = [
  {
    clave: "ACA-01",
    descripcion: "Piso de porcelanato 60×60 en pasillos y áreas comunes",
    unidad: "M2",
    volumen: 4_200,
  },
  {
    clave: "ACA-02",
    descripcion: "Aplanado fino y pintura vinílica en muros interiores",
    unidad: "M2",
    volumen: 9_500,
  },
  {
    clave: "ACA-03",
    descripcion: "Plafón de tablaroca con acabado liso en pasillos",
    unidad: "M2",
    volumen: 2_100,
  },
  {
    clave: "ACA-04",
    descripcion: "Zoclo de porcelanato de 10 cm",
    unidad: "ML",
    volumen: 3_800,
  },
  {
    clave: "ACA-05",
    descripcion: "Cancelería de aluminio con cristal templado en accesos",
    unidad: "M2",
    volumen: 180,
  },
];

/**
 * Acabados del héroe: aún sin contrato. Trae su catálogo y las rondas 1 y 2
 * capturadas por total; la PMO invita por el portal y eso abre la ronda 3.
 */
function licitacionAcabadosEnCurso(consecutivo: number): Licitacion {
  const invitados = [
    "prv-obra-07",
    "prv-obra-14",
    "prv-obra-16",
    "prv-obra-17",
    "prv-obra-06",
    "prv-obra-13",
    "prv-obra-10",
  ];
  const base = 6_400_000;
  const ronda1 = [
    ["prv-obra-07", 6_980_000],
    ["prv-obra-14", 7_210_000],
    ["prv-obra-16", 6_720_000],
    ["prv-obra-17", 7_540_000],
  ] as const;
  const ronda2 = [
    ["prv-obra-07", 6_610_000],
    ["prv-obra-14", 6_890_000],
    ["prv-obra-16", 6_540_000],
  ] as const;
  const aPropuestas = (lista: readonly (readonly [string, number])[]): PropuestaRonda[] =>
    lista.map(([proveedorId, monto]) => ({ proveedorId, respondio: true, monto }));
  const ronda1Completa: PropuestaRonda[] = [
    ...aPropuestas(ronda1),
    ...invitados
      .filter((id) => !ronda1.some(([r]) => r === id))
      .map((proveedorId) => ({ proveedorId, respondio: false })),
  ];
  const numero = String(consecutivo).padStart(2, "0");
  const id = `${ID_TERRENO_HEROE}-lic-${numero}`;
  const licitacion: Licitacion = {
    id,
    folio: `LIC-VR-${numero}`,
    terrenoId: ID_TERRENO_HEROE,
    partida: "ACABADOS",
    presupuestoBase: base,
    invitados,
    descartados: [
      {
        proveedorId: "prv-obra-17",
        ronda: 1,
        motivo: "Oferta más de 15% por encima del presupuesto base.",
      },
    ],
    rondas: [
      { numero: 1, fecha: sumarDias(DEMO_TODAY, -21), propuestas: ronda1Completa },
      { numero: 2, fecha: sumarDias(DEMO_TODAY, -7), propuestas: aPropuestas(ronda2) },
    ],
    estado: "EN_CURSO",
    conceptos: [],
    invitaciones: [],
  };
  return conCatalogo(
    licitacion,
    CATALOGO_ACABADOS.map((c, i) => ({ ...c, id: `${id}-k${i + 1}` })),
  );
}

/**
 * Licitaciones del héroe: una adjudicada por cada contrato de obra (con el monto
 * del contrato) y la de acabados en curso. Los proyectos ligeros no llevan.
 */
export function crearLicitaciones(contratos: readonly ContratoObra[]): Licitacion[] {
  const licitaciones: Licitacion[] = [];
  for (const contrato of contratos.filter((c) => c.terrenoId === ID_TERRENO_HEROE)) {
    const spec = SPECS[contrato.partida];
    if (!spec) continue;
    const licitacion = licitacionAdjudicada(contrato, spec, licitaciones.length + 1);
    if (licitacion) licitaciones.push(licitacion);
  }
  licitaciones.push(licitacionAcabadosEnCurso(licitaciones.length + 1));
  return licitaciones;
}
