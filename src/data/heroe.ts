import {
  DEMO_TODAY,
  pactarRegla,
  sumarDias,
  type Contrato,
  type Cotizacion,
  type EstatusLocal,
  type Factura,
  type FechaISO,
  type Local,
  type Locatario,
  type CategoriaMantenimiento,
  type Planta,
  type Plaza,
  type ReglaActualizacion,
} from "@/domain";
import {
  contratoPorFin,
  contratoPorInicio,
  crearFactura,
  crearLocatario,
  minimoAutorizado,
  type Contexto,
} from "./cartera";
import { CATALOGO, CIUDAD_HEROE } from "./catalogo";
import { coordenadasPlaza } from "./coordenadas";
import { evidenciaAntes, evidenciaDespues } from "./fotos";
import type { BorradorMantenimiento } from "./mantenimientos";
import { geometriaHeroePA, geometriaHeroePB, LIENZO, PLANTA_HEROE_PB_ID } from "./planos";
import { crearPrng } from "./prng";

export const PLAZA_HEROE_ID = "plz-alborada";
export const LOCAL_HEROE = "A-09";
export const COTIZACION_HEROE = "COT-2026-0418";

const CIUDAD_PLAZA_HEROE = CATALOGO.find((c) => c.id === CIUDAD_HEROE)!;

/** Parte del seed que aporta un conjunto de plazas. */
export interface ParteSeed {
  plazas: Plaza[];
  plantas: Planta[];
  locales: Local[];
  locatarios: Locatario[];
  contratos: Contrato[];
  facturas: Factura[];
  cotizaciones: Cotizacion[];
}

export const REGLA_DEFAULT_HEROE: ReglaActualizacion = {
  tipo: "INPC_PTS",
  puntos: 1,
  cuando: "ANIVERSARIO",
  modo: "SEMIAUTOMATICO",
};

/** Los locales de la plaza héroe heredan su default; libres aplican cada enero. */
function reglaLocalHeroe(ocupado: boolean): ReglaActualizacion {
  return { ...REGLA_DEFAULT_HEROE, cuando: ocupado ? "ANIVERSARIO" : "ENERO" };
}

type Codigo = "O" | "D" | "C";
const ESTATUS: Record<Codigo, EstatusLocal> = {
  O: "OCUPADO",
  D: "DISPONIBLE",
  C: "EN_COTIZACION",
};

interface Extra {
  /** Último día de vigencia del contrato (por vencer). */
  fin?: FechaISO;
  /** Días de atraso de la factura abierta. */
  atraso?: number;
  /** Inicio del contrato (cuando se necesita fijar el aniversario). */
  inicio?: FechaISO;
  ancla?: boolean;
}

/** código, estatus, m², precio de lista, locatario, giro, extras. */
type Fila = [string, Codigo, number, number, string?, string?, Extra?];

const PLANTA_BAJA: Fila[] = [
  ["A-01", "O", 55, 22000, "Farmacia Cardón", "Farmacia"],
  ["A-02", "O", 48, 19200, "Dental Brisa", "Dentista"],
  ["A-03", "D", 58, 23200],
  ["A-04", "O", 50, 19950, "Zapatería Paso Firme", "Zapatería"],
  ["A-05", "O", 66, 26400, "Tortas La Lumbre", "Restaurante", { fin: "2026-12-14" }],
  ["A-06", "O", 45, 17800, "Boutique Magnolia", "Boutique"],
  ["A-07", "O", 52, 20700, "Telefonía Conecta Norte", "Telefonía"],
  ["A-08", "O", 60, 23900, "Joyería Arrayán", "Joyería"],
  ["A-09", "D", 62, 24860],
  ["A-10", "C", 62, 24500],
  ["A-11", "O", 54, 21400, "Veterinaria Patitas", "Veterinaria"],
  ["A-12", "D", 56, 22300],
  ["A-13", "O", 49, 19500, "Panadería Trigal", "Panadería"],
  [
    "A-14",
    "O",
    55,
    21970,
    "Nutrición Brote",
    "Nutrición",
    { atraso: 14, inicio: "2025-04-20" },
  ],
  ["A-15", "D", 61, 24300],
  ["A-16", "O", 58, 23100, "Yoga Pitaya", "Yoga"],
  ["B-01", "O", 40, 16100, "Gimnasio Fuerza Sur", "Gimnasio"],
  ["B-02", "O", 52, 21300, "Café Raíz", "Cafetería"],
  ["B-03", "D", 46, 18400],
  ["B-04", "O", 44, 17700, "Tintorería Aurora", "Tintorería"],
  ["B-05", "O", 47, 18900, "Óptica Mirada Clara", "Óptica", { fin: "2026-11-30" }],
  ["B-06", "O", 43, 17300, "Barbería Don Mateo", "Barbería"],
  ["B-07", "D", 45, 18000],
  ["B-08", "O", 41, 16500, "Estética Coral", "Estética"],
  ["B-09", "O", 42, 16900, "Celulares Marea", "Telefonía"],
  ["B-10", "C", 44, 17600],
  ["C-01", "O", 140, 52000, "Banco Meridiano", "Banco", { ancla: true }],
  ["C-02", "O", 120, 45600, "Café Bruma", "Cafetería", { ancla: true }],
  ["C-03", "O", 130, 49400, "Pizzería Don Tano", "Restaurante", { ancla: true }],
  ["C-04", "D", 38, 15600],
  ["C-05", "O", 36, 14500, "Papelería Alba", "Papelería"],
  ["C-06", "O", 40, 16200, "Estética Bella Rosa", "Estética", { fin: "2027-01-08" }],
  ["C-07", "O", 37, 14850, "Papelería Trazo", "Papelería"],
  ["C-08", "O", 39, 15800, "Lavandería Duna", "Lavandería"],
  [
    "C-09",
    "O",
    62,
    25500,
    "Restaurante Mar y Sol",
    "Restaurante",
    { atraso: 6, inicio: "2024-10-28" },
  ],
  ["C-10", "D", 41, 16700],
  ["C-11", "C", 38, 15300],
  [
    "C-12",
    "O",
    35,
    13950,
    "Lavandería Burbuja",
    "Lavandería",
    { atraso: 54, inicio: "2024-01-10" },
  ],
  ["C-13", "D", 40, 16300],
  ["C-14", "O", 42, 17000, "Óptica Solana", "Óptica"],
];

const PLANTA_ALTA: Fila[] = [
  ["PA-01", "O", 40, 15200, "Despacho Contable Ríos", "Servicios"],
  ["PA-02", "D", 36, 13500],
  [
    "PA-03",
    "O",
    44,
    16400,
    "Academia de Idiomas Faro",
    "Educación",
    { fin: "2027-01-20" },
  ],
  ["PA-04", "D", 38, 14200],
  ["PA-05", "O", 42, 15800, "Clínica Dental Sonrisa", "Salud"],
  ["PA-06", "D", 35, 13000],
  ["PA-07", "O", 46, 17100, "Estudio de Danza Manglar", "Educación"],
  ["PA-08", "D", 37, 13800],
  ["PA-09", "O", 40, 15000, "Seguros del Valle", "Servicios"],
  ["PA-10", "D", 39, 14500],
  ["PA-11", "O", 45, 16800, "Spa Oasis", "Servicios"],
  ["PA-12", "O", 43, 16000, "Inmobiliaria Cantera", "Servicios", { fin: "2027-01-28" }],
  ["PA-13", "D", 36, 13400],
  ["PA-14", "O", 41, 15300, "Consultorio Médico Sol", "Salud"],
  ["PA-15", "D", 38, 14100],
  ["PA-16", "O", 44, 16500, "Gimnasio Cardio Norte", "Gimnasio"],
  ["PA-17", "D", 35, 13200],
  ["PA-18", "D", 40, 14900],
];

/** Prospectos y cotizaciones de los locales en cotización de la plaza héroe. */
const COTIZACIONES_EN_CURSO: Record<string, { folio: string; prospecto: string }> = {
  "A-10": { folio: "COT-2026-0409", prospecto: "Clínica Veterinaria Huellas" },
  "B-10": { folio: "COT-2026-0411", prospecto: "Heladería Polo Norte" },
  "C-11": { folio: "COT-2026-0415", prospecto: "Estudio Fotográfico Lente" },
};

/**
 * Plaza héroe, escrita a mano: 40 locales de planta baja con la geometría del
 * plano, 18 de planta alta, el local A-09 con su historial y la cotización
 * COT-2026-0418. Nombre ficticio.
 */
export function crearHeroe(ctx: Contexto): ParteSeed {
  const rng = crearPrng(7);
  const plantaBaja: Planta = {
    id: PLANTA_HEROE_PB_ID,
    plazaId: PLAZA_HEROE_ID,
    nombre: "Planta baja",
    ...LIENZO,
  };
  const plantaAlta: Planta = {
    ...plantaBaja,
    id: `${PLAZA_HEROE_ID}-pa`,
    nombre: "Planta alta",
  };
  const plaza: Plaza = {
    id: PLAZA_HEROE_ID,
    nombre: "Plaza Alborada",
    ciudadId: "culiacan",
    estatus: "EN_OPERACION",
    coordenadas: coordenadasPlaza(CIUDAD_PLAZA_HEROE, PLAZA_HEROE_ID),
    direccion: "Blvd. Las Palmas y Blvd. Costa Dorada, Fracc. Valle Alto",
    reglaDefault: REGLA_DEFAULT_HEROE,
  };

  const locales: Local[] = [];
  const locatarios: Locatario[] = [];
  const contratos: Contrato[] = [];
  const facturas: Factura[] = [];
  const cotizaciones: Cotizacion[] = [];

  const geoPB = geometriaHeroePB();
  const geoPA = geometriaHeroePA();

  const registrar = (fila: Fila, planta: Planta, geometria: Local["geometria"]) => {
    const [codigo, cod, m2, precio, nombre, giro, extra] = fila;
    const estatus = ESTATUS[cod];
    const id = `${PLAZA_HEROE_ID}-${codigo}`;
    const ocupado = estatus === "OCUPADO";
    const esHeroe = codigo === LOCAL_HEROE;
    const local: Local = {
      id,
      plazaId: PLAZA_HEROE_ID,
      plantaId: planta.id,
      codigo,
      estatus,
      areaM2: m2,
      precioVigente: precio,
      precioMinimo: esHeroe ? 23_500 : minimoAutorizado(precio),
      regla: reglaLocalHeroe(ocupado),
      geometria,
      historial: [],
      ancla: extra?.ancla,
    };

    if (esHeroe) {
      local.historial = [
        { fecha: "2021-11-01", precio: 18_740, motivo: "Último contrato firmado" },
      ];
      local.libreDesde = "2026-10-15";
      local.giro = "Alimentos, servicios, retail";
    } else if (estatus === "DISPONIBLE") {
      local.libreDesde = sumarDias(DEMO_TODAY, -rng.entero(5, 150));
    }

    if (ocupado && nombre && giro) {
      const locatario = crearLocatario(ctx, rng, nombre, giro);
      locatarios.push(locatario);
      local.locatarioId = locatario.id;
      local.giro = giro;
      const datos = { localId: id, locatarioId: locatario.id, rentaMensual: precio };
      const plazo = rng.elegir([36, 48, 60]);
      const contrato = extra?.inicio
        ? contratoPorInicio(ctx, datos, extra.inicio, 36)
        : contratoPorFin(
            ctx,
            datos,
            extra?.fin ?? sumarDias(DEMO_TODAY, rng.entero(120, 1000)),
            plazo,
          );
      contratos.push(contrato);
      local.historial = [{ fecha: contrato.inicio, precio, motivo: "Contrato firmado" }];
      facturas.push(crearFactura(ctx, rng, contrato, extra?.atraso));
    }

    const enCurso = COTIZACIONES_EN_CURSO[codigo];
    if (enCurso) {
      cotizaciones.push({
        id: enCurso.folio,
        localId: id,
        prospecto: {
          nombre: enCurso.prospecto,
          documentosCompletos: true,
          aval: "Aval solidario registrado",
        },
        rentaMensual: precio - 300,
        plazoMeses: 36,
        emitidaEl: sumarDias(DEMO_TODAY, -rng.entero(2, 9)),
        vigenteHasta: sumarDias(DEMO_TODAY, rng.entero(6, 13)),
        estado: "ENVIADA",
        ...pactarRegla(local.regla, REGLA_DEFAULT_HEROE),
      });
    }
    locales.push(local);
  };

  PLANTA_BAJA.forEach((fila) => registrar(fila, plantaBaja, geoPB[fila[0]]));
  PLANTA_ALTA.forEach((fila, i) => registrar(fila, plantaAlta, geoPA[i]));

  cotizaciones.push({
    id: COTIZACION_HEROE,
    localId: `${PLAZA_HEROE_ID}-${LOCAL_HEROE}`,
    prospecto: {
      nombre: "Café Tierra Alta, S.A. de C.V.",
      documentosCompletos: true,
      aval: "Fianza Afianzadora del Pacífico",
    },
    rentaMensual: 22_900,
    plazoMeses: 36,
    emitidaEl: DEMO_TODAY,
    vigenteHasta: sumarDias(DEMO_TODAY, 15),
    estado: "ENVIADA",
    ...pactarRegla(reglaLocalHeroe(false), REGLA_DEFAULT_HEROE),
    depositoMeses: 2,
    mesesGracia: 1,
    inicioContrato: "2026-12-01",
    giro: "Cafetería y repostería",
    elaboro: "Jorge Ramírez · Ventas",
    actividad: [
      {
        id: "visita",
        titulo: "Visita al local A-09 con Café Tierra Alta",
        fecha: sumarDias(DEMO_TODAY, -1),
      },
      {
        id: "enviada",
        titulo: `Cotización ${COTIZACION_HEROE} enviada al prospecto por correo`,
        fecha: DEMO_TODAY,
        hora: "12:05",
      },
      {
        id: "intento",
        titulo: "Jorge Ramírez intentó generar el contrato: bloqueado por precio mínimo",
        fecha: DEMO_TODAY,
        hora: "15:21",
      },
    ],
  });

  return {
    plazas: [plaza],
    plantas: [plantaBaja, plantaAlta],
    locales,
    locatarios,
    contratos,
    facturas,
    cotizaciones,
  };
}

const dias = (n: number): FechaISO => sumarDias(DEMO_TODAY, n);

/** Evidencia de un trabajo ya iniciado (y, si terminó, la del "después"). */
function evidenciaHeroe(
  categoria: CategoriaMantenimiento,
  semilla: string,
  finalizado: boolean,
) {
  const antes = evidenciaAntes(categoria, semilla);
  return finalizado ? [...antes, ...evidenciaDespues(categoria, semilla, antes)] : antes;
}

/**
 * Mantenimientos de Plaza Alborada escritos a mano: incluyen las filas de la
 * referencia de Arco (pintura del piso 1 con Mantenimientos Comerciales) y dos
 * trabajos del local A-09 (uno finalizado con evidencia, otro programado).
 */
export function mantenimientosHeroe(): BorradorMantenimiento[] {
  const a09 = `${PLAZA_HEROE_ID}-${LOCAL_HEROE}`;
  const base = { plazaId: PLAZA_HEROE_ID, proveedorId: "prv-1" } as const;
  return [
    {
      ...base,
      titulo: "Pintura completa piso 1",
      descripcion:
        "Repinte general de pasillos, columnas y fachadas interiores de planta baja.",
      tipo: "PREVENTIVO",
      categoria: "PINTURA",
      origen: "ADMINISTRACION",
      estatus: "FINALIZADO",
      fechaProgramada: dias(-8),
      fechaInicio: dias(-8),
      fechaFin: dias(-1),
      costoEstimado: 84_000,
      costoReal: 86_500,
      cargoA: "PLAZA",
      evidencia: evidenciaHeroe("PINTURA", "heroe-pintura-piso-1", true),
    },
    {
      ...base,
      localId: a09,
      titulo: "Pintura y resane del local A-09",
      descripcion:
        "Resane de muros y pintura completa antes de mostrar el local a prospectos.",
      tipo: "PREVENTIVO",
      categoria: "PINTURA",
      origen: "ADMINISTRACION",
      estatus: "FINALIZADO",
      fechaProgramada: dias(-27),
      fechaInicio: dias(-26),
      fechaFin: dias(-21),
      costoEstimado: 18_500,
      costoReal: 17_900,
      cargoA: "PLAZA",
      evidencia: evidenciaHeroe("PINTURA", "heroe-a09-pintura", true),
    },
    {
      ...base,
      localId: a09,
      titulo: "Limpieza profunda previa a entrega",
      descripcion: "Limpieza fina y pulido de piso para la entrega a Café Tierra Alta.",
      tipo: "PREVENTIVO",
      categoria: "LIMPIEZA",
      origen: "ADMINISTRACION",
      estatus: "PROGRAMADO",
      fechaProgramada: dias(17),
      costoEstimado: 4_800,
      cargoA: "PLAZA",
      evidencia: [],
    },
    {
      ...base,
      proveedorId: "prv-5",
      titulo: "Impermeabilización de azotea, ala B",
      descripcion:
        "Retiro de membrana dañada y aplicación de impermeabilizante prefabricado.",
      tipo: "CORRECTIVO",
      categoria: "IMPERMEABILIZACION",
      origen: "ADMINISTRACION",
      estatus: "EN_PROCESO",
      fechaProgramada: dias(-8),
      fechaInicio: dias(-6),
      costoEstimado: 126_000,
      cargoA: "PLAZA",
      evidencia: evidenciaHeroe("IMPERMEABILIZACION", "heroe-azotea-b", false),
    },
    {
      ...base,
      proveedorId: "prv-3",
      titulo: "Servicio a equipos de aire acondicionado",
      descripcion:
        "Limpieza de serpentines y revisión de gas en las manejadoras de pasillos.",
      tipo: "PREVENTIVO",
      categoria: "CLIMA",
      origen: "ADMINISTRACION",
      estatus: "PROGRAMADO",
      fechaProgramada: dias(-6),
      costoEstimado: 32_500,
      cargoA: "PLAZA",
      evidencia: [],
    },
    {
      ...base,
      proveedorId: "prv-2",
      titulo: "Revisión de tableros y luminarias",
      descripcion:
        "Termografía de tableros generales y reemplazo de luminarias de estacionamiento.",
      tipo: "PREVENTIVO",
      categoria: "ELECTRICO",
      origen: "ADMINISTRACION",
      estatus: "FINALIZADO",
      fechaProgramada: dias(-62),
      fechaInicio: dias(-62),
      fechaFin: dias(-59),
      costoEstimado: 41_000,
      costoReal: 39_200,
      cargoA: "PLAZA",
      evidencia: evidenciaHeroe("ELECTRICO", "heroe-tableros", true),
    },
    {
      ...base,
      proveedorId: "prv-4",
      localId: `${PLAZA_HEROE_ID}-C-09`,
      titulo: "Reparación de fuga en baño del restaurante",
      descripcion:
        "Cambio de válvula y tubería con fuga reportada por Restaurante Mar y Sol.",
      tipo: "CORRECTIVO",
      categoria: "PLOMERIA",
      origen: "LOCATARIO",
      estatus: "FINALIZADO",
      fechaProgramada: dias(-4),
      fechaInicio: dias(-3),
      fechaFin: dias(-2),
      costoEstimado: 6_000,
      costoReal: 6_200,
      cargoA: "LOCATARIO",
      evidencia: evidenciaHeroe("PLOMERIA", "heroe-c09-fuga", true),
    },
    {
      ...base,
      proveedorId: "prv-2",
      localId: `${PLAZA_HEROE_ID}-B-02`,
      titulo: "Reemplazo de luminarias del local",
      descripcion: "Café Raíz reporta luminarias que no encienden en el área de mesas.",
      tipo: "CORRECTIVO",
      categoria: "ELECTRICO",
      origen: "LOCATARIO",
      estatus: "PROGRAMADO",
      fechaProgramada: dias(7),
      costoEstimado: 9_800,
      cargoA: "LOCATARIO",
      evidencia: [],
    },
    {
      ...base,
      proveedorId: "prv-8",
      localId: `${PLAZA_HEROE_ID}-A-01`,
      titulo: "Reparación de equipo de clima",
      descripcion: "El minisplit de Farmacia Cardón no enfría; el equipo es de la plaza.",
      tipo: "CORRECTIVO",
      categoria: "CLIMA",
      origen: "LOCATARIO",
      estatus: "EN_PROCESO",
      fechaProgramada: dias(-3),
      fechaInicio: dias(-1),
      costoEstimado: 12_400,
      cargoA: "PLAZA",
      evidencia: evidenciaHeroe("CLIMA", "heroe-a01-clima", false),
    },
    {
      ...base,
      proveedorId: "prv-6",
      titulo: "Limpieza profunda de áreas comunes",
      descripcion: "Pulido de pisos y lavado de cristales en accesos y pasillos.",
      tipo: "PREVENTIVO",
      categoria: "LIMPIEZA",
      origen: "ADMINISTRACION",
      estatus: "CANCELADO",
      fechaProgramada: dias(-40),
      costoEstimado: 14_000,
      cargoA: "PLAZA",
      evidencia: [],
    },
    {
      ...base,
      proveedorId: "prv-7",
      titulo: "Renovación de señalética y pintura de cajones",
      descripcion: "Retoque de pintura vial y señalética del estacionamiento.",
      tipo: "PREVENTIVO",
      categoria: "PINTURA",
      origen: "ADMINISTRACION",
      estatus: "PROGRAMADO",
      fechaProgramada: dias(30),
      costoEstimado: 23_000,
      cargoA: "PLAZA",
      evidencia: [],
    },
  ];
}
