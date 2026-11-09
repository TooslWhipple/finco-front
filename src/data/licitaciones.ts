import { usuarioDeRol } from "@/config/usuarios";
import {
  DEMO_TODAY,
  montoContrato,
  sumarDias,
  type ContratoObra,
  type DescarteLicitacion,
  type FechaISO,
  type Licitacion,
  type PartidaObra,
  type PropuestaRonda,
  type ProveedorObra,
  type RondaLicitacion,
} from "@/domain";
import { ID_TERRENO_HEROE } from "./obra";

/** Contratistas a los que se invita a licitar; incluye a los que ganaron los contratos del héroe. */
export const PROVEEDORES_OBRA: readonly ProveedorObra[] = [
  {
    id: "prv-obra-01",
    nombre: "Terracerías del Pacífico",
    especialidades: ["TERRACERIAS", "CIMENTACION"],
  },
  {
    id: "prv-obra-02",
    nombre: "Constructora Delta",
    especialidades: ["CIMENTACION", "ESTRUCTURA"],
  },
  {
    id: "prv-obra-03",
    nombre: "Grupo Constructor Mayab",
    especialidades: ["MUROS", "ESTRUCTURA"],
  },
  {
    id: "prv-obra-04",
    nombre: "Instalaciones Hidrosinaloa",
    especialidades: ["INST_HIDRAULICAS"],
  },
  {
    id: "prv-obra-05",
    nombre: "Electrificaciones del Noroeste",
    especialidades: ["INST_ELECTRICAS"],
  },
  {
    id: "prv-obra-06",
    nombre: "Cubiertas y Losas del Norte",
    especialidades: ["TECHOS", "ESTRUCTURA"],
  },
  {
    id: "prv-obra-07",
    nombre: "Acabados y Pisos del Bajío",
    especialidades: ["ACABADOS"],
  },
  {
    id: "prv-obra-08",
    nombre: "Movimientos de Tierra del Golfo",
    especialidades: ["TERRACERIAS"],
  },
  {
    id: "prv-obra-09",
    nombre: "Obras y Estructuras Marinas",
    especialidades: ["MUROS", "CIMENTACION"],
  },
  {
    id: "prv-obra-10",
    nombre: "Constructora Tamaulipeca",
    especialidades: ["TERRACERIAS", "MUROS"],
  },
  {
    id: "prv-obra-11",
    nombre: "Ingeniería Eléctrica Integral",
    especialidades: ["INST_ELECTRICAS"],
  },
  {
    id: "prv-obra-12",
    nombre: "Hidráulica y Riego del Norte",
    especialidades: ["INST_HIDRAULICAS"],
  },
  {
    id: "prv-obra-13",
    nombre: "Impermeabilizantes y Cubiertas Regio",
    especialidades: ["TECHOS"],
  },
  { id: "prv-obra-14", nombre: "Pisos y Acabados Premier", especialidades: ["ACABADOS"] },
  {
    id: "prv-obra-15",
    nombre: "Concretos y Obras del Pacífico",
    especialidades: ["CIMENTACION", "ESTRUCTURA", "MUROS"],
  },
  {
    id: "prv-obra-16",
    nombre: "Edificaciones Lomas",
    especialidades: ["MUROS", "ACABADOS", "TECHOS"],
  },
  {
    id: "prv-obra-17",
    nombre: "Grupo Edificador Sonora",
    especialidades: ["MUROS", "ESTRUCTURA", "ACABADOS"],
  },
  {
    id: "prv-obra-18",
    nombre: "Servicios de Obra Civil Nova",
    especialidades: ["TERRACERIAS", "TECHOS", "MUROS"],
  },
];

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

const PROVEEDOR_POR_NOMBRE = new Map(PROVEEDORES_OBRA.map((p) => [p.nombre, p]));

/** Los invitados priorizan al ganador y a quienes tienen la especialidad; el resto completa la lista. */
function elegirInvitados(
  partida: PartidaObra,
  ganador: ProveedorObra,
  cuantos: number,
): ProveedorObra[] {
  const otros = PROVEEDORES_OBRA.filter((p) => p.id !== ganador.id);
  const afines = otros.filter((p) => p.especialidades.includes(partida));
  const resto = otros.filter((p) => !p.especialidades.includes(partida));
  const elegidos = [ganador, ...afines, ...resto].slice(0, cuantos);
  return PROVEEDORES_OBRA.filter((p) => elegidos.some((e) => e.id === p.id));
}

function redondear(monto: number): number {
  return Math.round(monto);
}

function licitacionAdjudicada(
  contrato: ContratoObra,
  spec: SpecLicitacion,
  consecutivo: number,
): Licitacion | undefined {
  const ganador = PROVEEDOR_POR_NOMBRE.get(contrato.contratista);
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
  };
}

/** Acabados del héroe: aún sin contrato; sirve para demostrar la captura de rondas en vivo. */
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
  return {
    id: `${ID_TERRENO_HEROE}-lic-${numero}`,
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
  };
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
