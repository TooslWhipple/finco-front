import { usuarioDeRol } from "@/config/usuarios";
import {
  avancePlaneadoContrato,
  cierreSemana,
  DEMO_TODAY,
  ETIQUETA_PARTIDA,
  firmarEstimacion,
  lunesDeSemana,
  pagoDeEstimacion,
  resolverEstimacion,
  sumarDias,
  type ActividadCronograma,
  type ConceptoObra,
  type ContratoObra,
  type CorteSemanal,
  type EstadoCorte,
  type EstimacionObra,
  type FaseCronograma,
  type FechaISO,
  type PagoObra,
  type PartidaObra,
  type Terreno,
  type UnidadObra,
  type VolumenCorte,
} from "@/domain";
import { evidenciaCorte } from "./fotos";
import { crearPrng, type Prng } from "./prng";

/** Terreno héroe de la demo de obra (Valle Real); su id lo fija el orden del seed. */
export const ID_TERRENO_HEROE = "ter-09";

const SEMILLA_OBRA = 2611;

/** [clave, descripción, unidad, volumen, precio unitario]. */
type SpecConcepto = readonly [string, string, UnidadObra, number, number];

/** Cómo ejecutó el contratista su contrato: base de los cortes y pagos generados. */
interface SpecEjecucion {
  /** Multiplicador del avance planeado de cada semana (1 = en tiempo). */
  ritmo: number;
  /** Ritmo de semanas puntuales; 0 deja la semana sin reporte. */
  semanas?: Readonly<Record<FechaISO, number>>;
  /** Semana cuyo corte quedó firmado y sin validar. */
  pendiente?: FechaISO;
  /** Semana cuyo primer corte la PMO rechazó (luego se recapturó). */
  rechazada?: FechaISO;
  /** Pesos pagados por cada peso de obra ganada (1 / CPI). */
  costo: number;
}

interface SpecContrato {
  partida: PartidaObra;
  contratista: string;
  inicio: FechaISO;
  fin: FechaISO;
  /** Días de desfase del arranque y cierre reales respecto al plan. */
  atraso: number;
  ejecucion: SpecEjecucion;
  /**
   * Qué pasa con el último corte validado cuando la obra lleva estimaciones:
   * `pendiente` es una estimación firmada que espera a la PMO; `libre` queda sin
   * estimar para que el Supervisor la registre en la demo.
   */
  colaEstimacion?: "pendiente" | "libre";
  conceptos: readonly SpecConcepto[];
}

interface SpecHito {
  titulo: string;
  fase: Exclude<FaseCronograma, "CONSTRUCCION">;
  inicio: FechaISO;
  fin: FechaISO;
  atraso: number;
}

interface SpecObra {
  /** Nombre del terreno, o `PREVENTA` para el primer terreno en esa etapa. */
  terreno: string;
  /** Prefijo del folio ("CO-VR-01"). */
  prefijo: string;
  /** Variación (fracción) de los volúmenes; 0 conserva los de la especificación. */
  variacion: number;
  /** La obra paga por estimaciones: anticipo de 30% y últimos pagos ligados a estimaciones autorizadas. */
  conEstimaciones?: boolean;
  previas: readonly SpecHito[];
  contratos: readonly SpecContrato[];
  entrega: SpecHito;
}

const VALLE_REAL: SpecObra = {
  terreno: "Terreno Valle Real",
  prefijo: "VR",
  variacion: 0,
  conEstimaciones: true,
  previas: [
    {
      titulo: "Diseño del proyecto ejecutivo",
      fase: "DISENO",
      inicio: "2026-02-09",
      fin: "2026-05-08",
      atraso: 0,
    },
    {
      titulo: "Presupuesto de obra",
      fase: "PRESUPUESTO",
      inicio: "2026-05-11",
      fin: "2026-06-12",
      atraso: 3,
    },
    {
      titulo: "Licitación y adjudicación de contratos",
      fase: "LICITACION",
      inicio: "2026-06-15",
      fin: "2026-08-21",
      atraso: 5,
    },
  ],
  contratos: [
    {
      partida: "TERRACERIAS",
      contratista: "Terracerías del Pacífico",
      inicio: "2026-08-24",
      fin: "2026-10-02",
      atraso: 4,
      ejecucion: { ritmo: 1, costo: 1.0526 },
      conceptos: [
        ["TER-01", "Excavación a cielo abierto", "M3", 9_500, 185],
        ["TER-02", "Relleno compactado con material de banco", "M3", 7_200, 310],
        ["TER-03", "Nivelación y compactación de terreno", "M2", 6_200, 48],
        ["TER-04", "Acarreo de material sobrante", "M3", 4_000, 120],
      ],
    },
    {
      partida: "CIMENTACION",
      contratista: "Constructora Delta",
      inicio: "2026-09-21",
      fin: "2026-11-20",
      atraso: 9,
      ejecucion: {
        ritmo: 1.25,
        rechazada: "2026-09-28",
        pendiente: "2026-10-26",
        costo: 1.0526,
      },
      colaEstimacion: "pendiente",
      conceptos: [
        ["CIM-01", "Plantilla de concreto pobre de 5 cm", "M2", 1_800, 210],
        ["CIM-02", "Zapatas de concreto f'c=250 kg/cm²", "M3", 620, 3_850],
        ["CIM-03", "Acero de refuerzo en cimentación", "KG", 78_000, 32],
        ["CIM-04", "Contratrabes de concreto armado", "M3", 340, 4_200],
        ["CIM-05", "Cimbra común en cimentación", "M2", 3_200, 420],
      ],
    },
    {
      partida: "MUROS",
      contratista: "Grupo Constructor Mayab",
      inicio: "2026-10-19",
      fin: "2026-12-18",
      atraso: 6,
      ejecucion: {
        ritmo: 1,
        semanas: { "2026-10-19": 0.8, "2026-10-26": 0 },
        costo: 1.05,
      },
      colaEstimacion: "libre",
      conceptos: [
        ["MUR-01", "Muro de block hueco de 15 cm", "M2", 7_800, 520],
        ["MUR-02", "Castillos de concreto armado", "ML", 4_200, 410],
        ["MUR-03", "Dalas de cerramiento", "ML", 3_600, 360],
        ["MUR-04", "Aplanado de mezcla en muros", "M2", 12_500, 235],
      ],
    },
    {
      partida: "INST_HIDRAULICAS",
      contratista: "Instalaciones Hidrosinaloa",
      inicio: "2026-10-26",
      fin: "2026-12-23",
      atraso: 3,
      ejecucion: { ritmo: 1.2, costo: 1.0526 },
      conceptos: [
        ["HID-01", "Red general de agua potable", "LOTE", 1, 1_850_000],
        ["HID-02", "Tubería sanitaria de PVC", "ML", 2_400, 650],
        ["HID-03", "Registros sanitarios de concreto", "PZA", 85, 9_800],
        ["HID-04", "Salidas hidráulicas y sanitarias por local", "PZA", 168, 6_400],
        ["HID-05", "Cisterna de almacenamiento", "LOTE", 1, 2_200_000],
      ],
    },
    {
      partida: "INST_ELECTRICAS",
      contratista: "Electrificaciones del Noroeste",
      inicio: "2026-11-09",
      fin: "2027-01-08",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1.0526 },
      conceptos: [
        ["ELE-01", "Subestación eléctrica y acometida", "LOTE", 1, 3_100_000],
        ["ELE-02", "Canalización con tubería conduit", "ML", 5_200, 280],
        ["ELE-03", "Cableado de alimentadores y circuitos", "ML", 18_000, 95],
        ["ELE-04", "Tableros de distribución por local", "PZA", 42, 18_500],
        ["ELE-05", "Luminarias de áreas comunes", "PZA", 360, 2_400],
      ],
    },
    {
      partida: "TECHOS",
      contratista: "Cubiertas y Losas del Norte",
      inicio: "2026-11-30",
      fin: "2027-01-22",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1.0526 },
      conceptos: [
        ["TEC-01", "Losa de vigueta y bovedilla", "M2", 3_400, 1_950],
        ["TEC-02", "Impermeabilización de azotea", "M2", 3_400, 320],
        ["TEC-03", "Pretiles de block y remate", "ML", 900, 780],
      ],
    },
  ],
  entrega: {
    titulo: "Entrega de llaves a Comercial",
    fase: "ENTREGA",
    inicio: "2027-01-25",
    fin: "2027-02-26",
    atraso: 0,
  },
};

const COSTA_AZUL: SpecObra = {
  terreno: "Terreno Costa Azul",
  prefijo: "CA",
  variacion: 0.08,
  previas: [
    {
      titulo: "Diseño del proyecto ejecutivo",
      fase: "DISENO",
      inicio: "2026-03-23",
      fin: "2026-06-26",
      atraso: 2,
    },
    {
      titulo: "Presupuesto de obra",
      fase: "PRESUPUESTO",
      inicio: "2026-06-29",
      fin: "2026-08-07",
      atraso: 0,
    },
    {
      titulo: "Licitación y adjudicación de contratos",
      fase: "LICITACION",
      inicio: "2026-08-10",
      fin: "2026-09-25",
      atraso: 4,
    },
  ],
  contratos: [
    {
      partida: "TERRACERIAS",
      contratista: "Movimientos de Tierra del Golfo",
      inicio: "2026-10-05",
      fin: "2026-11-27",
      atraso: 3,
      ejecucion: { ritmo: 1.1, costo: 1.02 },
      conceptos: [
        ["TER-01", "Excavación a cielo abierto", "M3", 7_800, 190],
        ["TER-02", "Relleno compactado con material de banco", "M3", 5_900, 320],
      ],
    },
    {
      partida: "CIMENTACION",
      contratista: "Constructora Delta",
      inicio: "2026-11-16",
      fin: "2027-01-29",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1.02 },
      conceptos: [
        ["CIM-01", "Zapatas de concreto f'c=250 kg/cm²", "M3", 480, 3_900],
        ["CIM-02", "Acero de refuerzo en cimentación", "KG", 61_000, 33],
        ["CIM-03", "Cimbra común en cimentación", "M2", 2_600, 430],
      ],
    },
    {
      partida: "MUROS",
      contratista: "Obras y Estructuras Marinas",
      inicio: "2027-01-25",
      fin: "2027-03-26",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1.02 },
      conceptos: [
        ["MUR-01", "Muro de block hueco de 15 cm", "M2", 6_100, 535],
        ["MUR-02", "Castillos y dalas de concreto armado", "ML", 6_300, 395],
      ],
    },
    {
      partida: "INST_HIDRAULICAS",
      contratista: "Instalaciones Hidrosinaloa",
      inicio: "2027-02-15",
      fin: "2027-04-30",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1.02 },
      conceptos: [
        ["HID-01", "Red general de agua potable", "LOTE", 1, 1_520_000],
        ["HID-02", "Tubería sanitaria de PVC", "ML", 1_900, 660],
      ],
    },
  ],
  entrega: {
    titulo: "Entrega de llaves a Comercial",
    fase: "ENTREGA",
    inicio: "2027-07-12",
    fin: "2027-09-10",
    atraso: 0,
  },
};

const PLAZA_PREVENTA: SpecObra = {
  terreno: "PREVENTA",
  prefijo: "PV",
  variacion: 0.06,
  previas: [
    {
      titulo: "Diseño del proyecto ejecutivo",
      fase: "DISENO",
      inicio: "2025-03-10",
      fin: "2025-06-06",
      atraso: 0,
    },
    {
      titulo: "Presupuesto de obra",
      fase: "PRESUPUESTO",
      inicio: "2025-06-09",
      fin: "2025-07-04",
      atraso: 0,
    },
    {
      titulo: "Licitación y adjudicación de contratos",
      fase: "LICITACION",
      inicio: "2025-07-07",
      fin: "2025-08-22",
      atraso: 2,
    },
  ],
  contratos: [
    {
      partida: "TERRACERIAS",
      contratista: "Terracerías del Pacífico",
      inicio: "2025-08-25",
      fin: "2025-10-10",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1 },
      conceptos: [
        ["TER-01", "Excavación a cielo abierto", "M3", 6_400, 180],
        ["TER-02", "Relleno compactado con material de banco", "M3", 4_800, 300],
      ],
    },
    {
      partida: "CIMENTACION",
      contratista: "Constructora Delta",
      inicio: "2025-10-13",
      fin: "2025-12-19",
      atraso: 5,
      ejecucion: { ritmo: 1, costo: 1 },
      conceptos: [
        ["CIM-01", "Zapatas de concreto f'c=250 kg/cm²", "M3", 410, 3_800],
        ["CIM-02", "Acero de refuerzo en cimentación", "KG", 52_000, 31],
      ],
    },
    {
      partida: "MUROS",
      contratista: "Grupo Constructor Mayab",
      inicio: "2026-01-12",
      fin: "2026-04-17",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1 },
      conceptos: [
        ["MUR-01", "Muro de block hueco de 15 cm", "M2", 5_200, 505],
        ["MUR-02", "Castillos y dalas de concreto armado", "ML", 5_400, 380],
      ],
    },
    {
      partida: "ACABADOS",
      contratista: "Acabados y Pisos del Bajío",
      inicio: "2026-04-20",
      fin: "2026-09-18",
      atraso: 0,
      ejecucion: { ritmo: 1, costo: 1 },
      conceptos: [
        ["ACA-01", "Piso de concreto pulido en locales", "M2", 3_100, 560],
        ["ACA-02", "Pintura vinílica en muros", "M2", 9_800, 95],
      ],
    },
  ],
  entrega: {
    titulo: "Entrega de llaves a Comercial",
    fase: "ENTREGA",
    inicio: "2026-09-21",
    fin: "2026-11-27",
    atraso: 0,
  },
};

const OBRAS: readonly SpecObra[] = [VALLE_REAL, COSTA_AZUL, PLAZA_PREVENTA];

/** Fechas reales de una actividad: arranca y cierra con su desfase si ya ocurrió. */
function fechasReales(
  inicio: FechaISO,
  fin: FechaISO,
  atraso: number,
): Pick<ActividadCronograma, "inicioReal" | "finReal"> {
  const inicioReal = sumarDias(inicio, atraso);
  const finReal = sumarDias(fin, atraso);
  return {
    ...(inicioReal <= DEMO_TODAY ? { inicioReal } : {}),
    ...(finReal <= DEMO_TODAY ? { finReal } : {}),
  };
}

function variar(volumen: number, variacion: number, rng: Prng): number {
  if (variacion === 0 || volumen === 1) return volumen;
  const factor = 1 + (rng.siguiente() * 2 - 1) * variacion;
  return Math.max(1, Math.round(volumen * factor));
}

function conceptosDe(
  contratoId: string,
  specs: readonly SpecConcepto[],
  variacion: number,
  rng: Prng,
): ConceptoObra[] {
  return specs.map(([clave, descripcion, unidad, volumen, precioUnitario], i) => ({
    id: `${contratoId}-c${i + 1}`,
    clave,
    descripcion,
    unidad,
    volumenContratado: variar(volumen, variacion, rng),
    precioUnitario,
  }));
}

function terrenoDe(spec: SpecObra, terrenos: readonly Terreno[]): Terreno | undefined {
  return spec.terreno === "PREVENTA"
    ? terrenos.find((t) => t.etapa === "PREVENTA")
    : terrenos.find((t) => t.nombre === spec.terreno);
}

export interface DatosObra {
  contratos: ContratoObra[];
  cronograma: ActividadCronograma[];
  cortes: CorteSemanal[];
  pagos: PagoObra[];
  estimaciones: EstimacionObra[];
}

/** Anticipo de los contratos de obra que se pagan por estimación. */
const ANTICIPO_PCT = 0.3;

/** Fondo de garantía que se retiene de cada estimación. */
const FONDO_GARANTIA_PCT = 0.05;

/** Última semana con corte posible: la anterior a la de "hoy", que aún corre. */
const ULTIMA_SEMANA_CON_CORTE = sumarDias(lunesDeSemana(DEMO_TODAY), -7);

/** Cada cuántos cortes validados se registra un pago al contratista. */
const CORTES_POR_PAGO = 2;

const redondearVolumen = (volumen: number, unidad: UnidadObra): number =>
  unidad === "PZA" ? Math.round(volumen) : Math.round(volumen * 100) / 100;

/** Lunes de cada semana de ejecución del contrato que ya pudo reportarse. */
function semanasDeEjecucion(contrato: ContratoObra): FechaISO[] {
  const ultima = lunesDeSemana(
    contrato.finPlan < ULTIMA_SEMANA_CON_CORTE
      ? contrato.finPlan
      : ULTIMA_SEMANA_CON_CORTE,
  );
  const semanas: FechaISO[] = [];
  for (let s = lunesDeSemana(contrato.inicioPlan); s <= ultima; s = sumarDias(s, 7)) {
    semanas.push(s);
  }
  return semanas;
}

interface CortesDeContrato {
  cortes: CorteSemanal[];
  pagos: PagoObra[];
  estimaciones: EstimacionObra[];
}

/** Corte validado ya listo para cobrarse: lo que alimenta pagos y estimaciones. */
interface CorteCobrable {
  semana: FechaISO;
  firmadoEn: FechaISO;
  volumenes: VolumenCorte[];
  /** Volumen × precio unitario. */
  importe: number;
}

/** Máximo de estimaciones autorizadas que genera la semilla por contrato. */
const MAX_ESTIMACIONES_AUTORIZADAS = 3;

function enGrupos<T>(lista: readonly T[], tamano: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) grupos.push(lista.slice(i, i + tamano));
  return grupos;
}

/** Suma los volúmenes de varios cortes por concepto. */
function volumenesDelGrupo(grupo: readonly CorteCobrable[]): VolumenCorte[] {
  const acumulado = new Map<string, number>();
  for (const corte of grupo) {
    for (const { conceptoId, volumen } of corte.volumenes) {
      acumulado.set(conceptoId, (acumulado.get(conceptoId) ?? 0) + volumen);
    }
  }
  return [...acumulado].map(([conceptoId, volumen]) => ({
    conceptoId,
    volumen: Math.round(volumen * 100) / 100,
  }));
}

/**
 * Paga lo validado al costo del contrato, un pago por cada par de cortes. Es el
 * historial de un contrato que no lleva estimaciones.
 */
function pagosPorCortes(
  contrato: ContratoObra,
  validados: readonly CorteCobrable[],
  costo: number,
): PagoObra[] {
  const pagos: PagoObra[] = [];
  let ganado = 0;
  let pagado = 0;
  for (const grupo of enGrupos(validados, CORTES_POR_PAGO)) {
    ganado += grupo.reduce((suma, c) => suma + c.importe, 0);
    const monto = Math.round(ganado * costo) - pagado;
    if (monto <= 0) continue;
    pagado += monto;
    pagos.push({
      id: `pago-${contrato.id}-${pagos.length + 1}`,
      contratoObraId: contrato.id,
      fecha: grupo[grupo.length - 1].firmadoEn,
      monto,
      folioFactura: `FAC-${contrato.folio}-${pagos.length + 1}`,
    });
  }
  return pagos;
}

/**
 * Pagos y estimaciones de un contrato que se paga por estimación. Los últimos
 * grupos de cortes son estimaciones autorizadas, cuyo pago es su importe bruto;
 * lo anterior es historial. El sobrecosto del contrato (`costo`) se reparte en el
 * historial para que el CPI del héroe no cambie. El último corte puede quedar como
 * estimación pendiente de la PMO o sin estimar; en ambos casos ya se había pagado
 * a cuenta, como parte del historial.
 */
function liquidarPorEstimaciones(
  contrato: ContratoObra,
  validados: readonly CorteCobrable[],
  ejecucion: SpecEjecucion,
  cola: SpecContrato["colaEstimacion"],
  siguienteIdEstimacion: () => string,
): Pick<CortesDeContrato, "pagos" | "estimaciones"> {
  const supervisor = usuarioDeRol("SUPERVISOR_OBRA").nombre;
  const pmo = usuarioDeRol("PMO").nombre;
  const ultimo = validados.at(-1);
  const colaCorte = cola && ultimo ? ultimo : undefined;
  const pagables = colaCorte ? validados.slice(0, -1) : validados;
  const grupos = enGrupos(pagables, CORTES_POR_PAGO);
  // Sin corte de cola, el historial debe conservar un grupo que absorba el sobrecosto.
  const nAutorizadas = Math.min(
    MAX_ESTIMACIONES_AUTORIZADAS,
    colaCorte || grupos.length === 1 ? grupos.length : grupos.length - 1,
  );
  const estimados = grupos.slice(grupos.length - nAutorizadas);
  // El último corte (pendiente de estimar o sin estimar) se pagó a cuenta, igual que el historial.
  const historial: CorteCobrable[][] = [
    ...grupos.slice(0, grupos.length - nAutorizadas),
    ...(colaCorte ? [[colaCorte]] : []),
  ];

  const estimaciones: EstimacionObra[] = [];
  const pagosEstimacion: PagoObra[] = [];
  const crear = (grupo: readonly CorteCobrable[]): EstimacionObra => {
    const id = siguienteIdEstimacion();
    const fecha = grupo[grupo.length - 1].firmadoEn;
    const firmada = firmarEstimacion(
      id,
      contrato,
      { contratoObraId: contrato.id, volumenes: volumenesDelGrupo(grupo) },
      estimaciones,
      supervisor,
      fecha,
      evidenciaCorte(`${id}-${fecha}`),
    );
    return {
      ...firmada,
      periodo: {
        desde: grupo[0].semana,
        hasta: cierreSemana(grupo[grupo.length - 1].semana),
      },
    };
  };
  for (const grupo of estimados) {
    const fecha = grupo[grupo.length - 1].firmadoEn;
    const autorizada = resolverEstimacion(crear(grupo), "AUTORIZADA_PMO", pmo, fecha);
    const pago = pagoDeEstimacion(autorizada, contrato, fecha);
    estimaciones.push({ ...autorizada, pagoId: pago.id });
    pagosEstimacion.push(pago);
  }
  if (colaCorte && cola === "pendiente") {
    estimaciones.push(crear([colaCorte]));
  }

  // Lo que el contratista cobró de más sobre el valor ganado va al historial.
  const objetivo = Math.round(
    validados.reduce((suma, c) => suma + c.importe, 0) * ejecucion.costo,
  );
  const brutoEstimado = pagosEstimacion.reduce((suma, p) => suma + p.monto, 0);
  const restante = objetivo - brutoEstimado;
  const ganadoHistorial = historial.flat().reduce((suma, c) => suma + c.importe, 0);
  const pagosHistorial: PagoObra[] = [];
  let repartido = 0;
  historial.forEach((grupo, i) => {
    const importe = grupo.reduce((suma, c) => suma + c.importe, 0);
    const monto =
      i === historial.length - 1
        ? restante - repartido
        : Math.round((restante * importe) / ganadoHistorial);
    repartido += monto;
    if (monto <= 0) return;
    pagosHistorial.push({
      id: `pago-${contrato.id}-${pagosHistorial.length + 1}`,
      contratoObraId: contrato.id,
      fecha: grupo[grupo.length - 1].firmadoEn,
      monto,
      folioFactura: `FAC-${contrato.folio}-${pagosHistorial.length + 1}`,
    });
  });
  return { pagos: [...pagosHistorial, ...pagosEstimacion], estimaciones };
}

/**
 * Cortes semanales y pagos de un contrato: el volumen de cada semana sigue el
 * avance planeado multiplicado por el ritmo del contratista. El último corte de
 * un contrato que cumplió su plan lo deja al 100%.
 */
function ejecutarContrato(
  contrato: ContratoObra,
  spec: SpecContrato,
  conEstimaciones: boolean,
  siguienteIdCorte: () => string,
  siguienteIdEstimacion: () => string,
): CortesDeContrato {
  const { ejecucion } = spec;
  const supervisor = usuarioDeRol("SUPERVISOR_OBRA").nombre;
  const pmo = usuarioDeRol("PMO").nombre;
  const cortes: CorteSemanal[] = [];
  const validados: CorteCobrable[] = [];
  let fraccion = 0;

  const volumenesHasta = (acumulada: number, anterior: number) =>
    contrato.conceptos
      .map((c) => ({
        conceptoId: c.id,
        volumen:
          redondearVolumen(c.volumenContratado * acumulada, c.unidad) -
          redondearVolumen(c.volumenContratado * anterior, c.unidad),
        precio: c.precioUnitario,
      }))
      .filter((v) => v.volumen > 0);

  for (const semana of semanasDeEjecucion(contrato)) {
    const ritmo = ejecucion.semanas?.[semana] ?? ejecucion.ritmo;
    if (ritmo === 0) continue;
    const planeadoSemana =
      avancePlaneadoContrato(contrato, cierreSemana(semana)) -
      avancePlaneadoContrato(contrato, sumarDias(semana, -1));
    const cumple = ritmo >= 1 && cierreSemana(semana) >= contrato.finPlan;
    const nueva = cumple ? 1 : Math.min(1, fraccion + planeadoSemana * ritmo);
    const volumenes = volumenesHasta(nueva, fraccion);
    if (volumenes.length === 0) continue;
    fraccion = nueva;

    const id = siguienteIdCorte();
    const firmadoEn = sumarDias(semana, 4);
    const base = {
      contratoObraId: contrato.id,
      semana,
      volumenes: volumenes.map(({ conceptoId, volumen }) => ({ conceptoId, volumen })),
      capturadoPor: supervisor,
      firmadoPor: supervisor,
      firmadoEn,
    };
    const corte = (
      estado: EstadoCorte,
      idCorte: string,
      extra: Partial<CorteSemanal> = {},
    ): CorteSemanal => ({
      ...base,
      id: idCorte,
      estado,
      evidencia: evidenciaCorte(`${idCorte}-${semana}`),
      ...extra,
    });

    if (semana === ejecucion.rechazada) {
      // El primer corte se rechazó por inflar el volumen; el de arriba es el recapturado.
      cortes.push(
        corte("RECHAZADO", id, {
          volumenes: base.volumenes.map((v) => ({
            ...v,
            volumen: redondearVolumen(v.volumen * 1.4, "M2"),
          })),
          validadoPor: pmo,
          validadoEn: sumarDias(semana, 7),
          comentario:
            "El volumen reportado no coincide con las estimaciones del contratista.",
        }),
      );
    }
    const idFinal = semana === ejecucion.rechazada ? siguienteIdCorte() : id;
    if (semana === ejecucion.pendiente) {
      cortes.push(corte("FIRMADO_SUPERVISOR", idFinal));
      continue;
    }
    cortes.push(
      corte("VALIDADO_PMO", idFinal, {
        validadoPor: pmo,
        validadoEn: sumarDias(semana, 7),
      }),
    );

    validados.push({
      semana,
      firmadoEn,
      volumenes: base.volumenes,
      importe: volumenes.reduce((suma, v) => suma + v.volumen * v.precio, 0),
    });
  }
  if (conEstimaciones) {
    return {
      cortes,
      ...liquidarPorEstimaciones(
        contrato,
        validados,
        ejecucion,
        spec.colaEstimacion,
        siguienteIdEstimacion,
      ),
    };
  }
  return {
    cortes,
    pagos: pagosPorCortes(contrato, validados, ejecucion.costo),
    estimaciones: [],
  };
}

/**
 * Contratos de obra y cronograma del héroe (Valle Real, completo) y de dos
 * proyectos ligeros (Costa Azul y el primer terreno en preventa).
 */
export function crearObra(terrenos: readonly Terreno[]): DatosObra {
  const rng = crearPrng(SEMILLA_OBRA);
  const contratos: ContratoObra[] = [];
  const cronograma: ActividadCronograma[] = [];
  const cortes: CorteSemanal[] = [];
  const pagos: PagoObra[] = [];
  const estimaciones: EstimacionObra[] = [];
  let consecutivoCorte = 0;
  const siguienteIdCorte = () => `cor-${String(++consecutivoCorte).padStart(4, "0")}`;
  let consecutivoEstimacion = 0;
  const siguienteIdEstimacion = () =>
    `est-${String(++consecutivoEstimacion).padStart(4, "0")}`;

  for (const spec of OBRAS) {
    const terreno = terrenoDe(spec, terrenos);
    if (!terreno) continue;
    const hito = (h: SpecHito, n: number): ActividadCronograma => ({
      id: `${terreno.id}-act-${h.fase.toLowerCase()}-${n}`,
      terrenoId: terreno.id,
      fase: h.fase,
      titulo: h.titulo,
      inicioPlan: h.inicio,
      finPlan: h.fin,
      ...fechasReales(h.inicio, h.fin, h.atraso),
    });

    spec.previas.forEach((h, i) => cronograma.push(hito(h, i + 1)));
    spec.contratos.forEach((c, i) => {
      const id = `${terreno.id}-co-${String(i + 1).padStart(2, "0")}`;
      const contrato: ContratoObra = {
        id,
        folio: `CO-${spec.prefijo}-${String(i + 1).padStart(2, "0")}`,
        terrenoId: terreno.id,
        partida: c.partida,
        contratista: c.contratista,
        conceptos: conceptosDe(id, c.conceptos, spec.variacion, rng),
        inicioPlan: c.inicio,
        finPlan: c.fin,
        anticipoPct: spec.conEstimaciones ? ANTICIPO_PCT : 0,
        fondoGarantiaPct: FONDO_GARANTIA_PCT,
      };
      contratos.push(contrato);
      const ejecutado = ejecutarContrato(
        contrato,
        c,
        spec.conEstimaciones === true,
        siguienteIdCorte,
        siguienteIdEstimacion,
      );
      cortes.push(...ejecutado.cortes);
      pagos.push(...ejecutado.pagos);
      estimaciones.push(...ejecutado.estimaciones);
      cronograma.push({
        id: `${terreno.id}-act-construccion-${i + 1}`,
        terrenoId: terreno.id,
        fase: "CONSTRUCCION",
        titulo: ETIQUETA_PARTIDA[c.partida],
        inicioPlan: c.inicio,
        finPlan: c.fin,
        ...fechasReales(c.inicio, c.fin, c.atraso),
        contratoObraId: id,
      });
    });
    cronograma.push(hito(spec.entrega, 1));
  }
  return { contratos, cronograma, cortes, pagos, estimaciones };
}
