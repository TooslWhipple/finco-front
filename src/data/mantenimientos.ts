import {
  DEMO_TODAY,
  formatearFolio,
  sumarDias,
  type CategoriaMantenimiento,
  type EstatusMantenimiento,
  type Local,
  type Mantenimiento,
  type Plaza,
  type TipoMantenimiento,
} from "@/domain";
import { PROVEEDORES } from "./catalogo";
import { evidenciaAntes, evidenciaDespues } from "./fotos";
import { mantenimientosHeroe } from "./heroe";
import { crearPrng, type Prng } from "./prng";

/** Mantenimiento antes de recibir su id y su folio consecutivo. */
export type BorradorMantenimiento = Omit<Mantenimiento, "id" | "folio">;

const SEMILLA_MANTENIMIENTOS = 4107;

/** Ventana de fechas programadas: de 6 meses atrás a 2 meses adelante. */
const DIAS_ATRAS = 180;
const DIAS_ADELANTE = 60;

interface PlantillaTrabajo {
  titulo: string;
  descripcion: string;
}

const PREVENTIVOS: Readonly<Record<CategoriaMantenimiento, readonly PlantillaTrabajo[]>> =
  {
    PINTURA: [
      {
        titulo: "Pintura de pasillos y fachada interior",
        descripcion: "Repinte general de muros y columnas de áreas comunes.",
      },
      {
        titulo: "Renovación de señalética y pintura de cajones",
        descripcion:
          "Retoque de pintura vial y renovación de señalética del estacionamiento.",
      },
    ],
    IMPERMEABILIZACION: [
      {
        titulo: "Impermeabilización preventiva de azotea",
        descripcion: "Aplicación de membrana antes de la temporada de lluvias.",
      },
    ],
    ELECTRICO: [
      {
        titulo: "Revisión de tableros y luminarias",
        descripcion: "Termografía de tableros y reemplazo de luminarias fundidas.",
      },
      {
        titulo: "Mantenimiento de subestación",
        descripcion: "Limpieza y ajuste de conexiones en la subestación eléctrica.",
      },
    ],
    PLOMERIA: [
      {
        titulo: "Limpieza de registros y cisternas",
        descripcion: "Desazolve preventivo de registros sanitarios y lavado de cisterna.",
      },
    ],
    CLIMA: [
      {
        titulo: "Servicio a equipos de aire acondicionado",
        descripcion: "Limpieza de serpentines, filtros y revisión de gas refrigerante.",
      },
    ],
    LIMPIEZA: [
      {
        titulo: "Limpieza profunda de áreas comunes",
        descripcion: "Pulido de pisos y lavado de cristales en pasillos y accesos.",
      },
    ],
  };

const CORRECTIVOS: Readonly<Record<CategoriaMantenimiento, readonly PlantillaTrabajo[]>> =
  {
    PINTURA: [
      {
        titulo: "Reparación de muro dañado y pintura",
        descripcion: "Resane y pintura de un muro afectado por humedad.",
      },
    ],
    IMPERMEABILIZACION: [
      {
        titulo: "Reparación de filtración en techo",
        descripcion: "Sellado de una filtración reportada tras las últimas lluvias.",
      },
    ],
    ELECTRICO: [
      {
        titulo: "Corrección de corto en contactos",
        descripcion: "Cambio de interruptor termomagnético y cableado dañado.",
      },
      {
        titulo: "Reemplazo de balastros y luminarias",
        descripcion: "Cambio de luminarias que no encienden en el local.",
      },
    ],
    PLOMERIA: [
      {
        titulo: "Reparación de fuga en baño",
        descripcion: "Cambio de válvula y tubería con fuga reportada.",
      },
      {
        titulo: "Desazolve de drenaje",
        descripcion: "Destape de la línea de drenaje con retorno de aguas.",
      },
    ],
    CLIMA: [
      {
        titulo: "Reparación de equipo de clima",
        descripcion: "Diagnóstico y reparación de un equipo que no enfría.",
      },
    ],
    LIMPIEZA: [
      {
        titulo: "Limpieza posterior a obra",
        descripcion: "Retiro de escombro y limpieza fina tras una reparación.",
      },
    ],
  };

/** Rango de costo estimado (MXN) por categoría. */
const COSTO_BASE: Readonly<Record<CategoriaMantenimiento, readonly [number, number]>> = {
  PINTURA: [8_000, 85_000],
  IMPERMEABILIZACION: [25_000, 160_000],
  ELECTRICO: [3_500, 60_000],
  PLOMERIA: [2_500, 35_000],
  CLIMA: [4_000, 70_000],
  LIMPIEZA: [2_000, 18_000],
};

type Categoria = CategoriaMantenimiento;
const CATEGORIAS: readonly Categoria[] = [
  "PINTURA",
  "IMPERMEABILIZACION",
  "ELECTRICO",
  "PLOMERIA",
  "CLIMA",
  "LIMPIEZA",
];

function redondear100(valor: number): number {
  return Math.round(valor / 100) * 100;
}

/** Estatus plausible según qué tan cerca de hoy cae la fecha programada. */
function elegirEstatus(rng: Prng, programada: string): EstatusMantenimiento {
  if (programada >= DEMO_TODAY) return "PROGRAMADO";
  const reciente = programada >= sumarDias(DEMO_TODAY, -25);
  const tirada = rng.siguiente();
  if (reciente) {
    if (tirada < 0.25) return "EN_PROCESO";
    if (tirada < 0.45) return "PROGRAMADO";
    return "FINALIZADO";
  }
  if (tirada < 0.04) return "PROGRAMADO";
  return tirada < 0.12 ? "CANCELADO" : "FINALIZADO";
}

function crearBorrador(
  rng: Prng,
  plaza: Plaza,
  locales: readonly Local[],
  indice: number,
): BorradorMantenimiento {
  const categoria = rng.elegir(CATEGORIAS);
  const tipo: TipoMantenimiento = rng.prob(0.55) ? "PREVENTIVO" : "CORRECTIVO";
  const local = tipo === "CORRECTIVO" && rng.prob(0.7) ? rng.elegir(locales) : undefined;
  const origen =
    tipo === "CORRECTIVO" && local?.estatus === "OCUPADO" && rng.prob(0.6)
      ? "LOCATARIO"
      : "ADMINISTRACION";
  const cargoA = origen === "LOCATARIO" && rng.prob(0.7) ? "LOCATARIO" : "PLAZA";
  const proveedor = rng.elegir(
    PROVEEDORES.filter((p) => p.especialidades.includes(categoria)),
  );
  const plantilla = rng.elegir(
    (tipo === "PREVENTIVO" ? PREVENTIVOS : CORRECTIVOS)[categoria],
  );
  const fechaProgramada = sumarDias(DEMO_TODAY, rng.entero(-DIAS_ATRAS, DIAS_ADELANTE));
  const [minimo, maximo] = COSTO_BASE[categoria];
  const costoEstimado = redondear100(minimo + rng.siguiente() * (maximo - minimo));
  const estatus = elegirEstatus(rng, fechaProgramada);
  const semilla = `${plaza.id}-${indice}`;

  const base: BorradorMantenimiento = {
    plazaId: plaza.id,
    localId: local?.id,
    titulo: plantilla.titulo,
    descripcion: plantilla.descripcion,
    tipo,
    categoria,
    origen,
    estatus,
    proveedorId: proveedor.id,
    fechaProgramada,
    costoEstimado,
    cargoA,
    evidencia: [],
  };

  if (estatus === "EN_PROCESO" || estatus === "FINALIZADO") {
    const fechaInicio = sumarDias(fechaProgramada, rng.entero(0, 3));
    base.fechaInicio = fechaInicio > DEMO_TODAY ? DEMO_TODAY : fechaInicio;
    base.evidencia = evidenciaAntes(categoria, semilla);
  }
  if (estatus === "FINALIZADO" && base.fechaInicio) {
    const fin = sumarDias(base.fechaInicio, rng.entero(0, 6));
    base.fechaFin = fin > DEMO_TODAY ? DEMO_TODAY : fin;
    base.costoReal = redondear100(costoEstimado * (0.9 + rng.siguiente() * 0.3));
    base.evidencia = [
      ...base.evidencia,
      ...evidenciaDespues(categoria, semilla, base.evidencia),
    ];
  }
  return base;
}

/**
 * Mantenimientos del seed: los de la plaza héroe escritos a mano más 3 a 8 por
 * cada plaza en operación. El id y el folio (`MNT-<año>-<NNNN>`) se asignan al
 * final, en orden de fecha programada. Usa su propio PRNG: no mueve el resto del seed.
 */
export function crearMantenimientos(
  plazas: readonly Plaza[],
  locales: readonly Local[],
): Mantenimiento[] {
  const rng = crearPrng(SEMILLA_MANTENIMIENTOS);
  const porPlaza = new Map<string, Local[]>();
  for (const l of locales)
    porPlaza.set(l.plazaId, [...(porPlaza.get(l.plazaId) ?? []), l]);

  const borradores: BorradorMantenimiento[] = [...mantenimientosHeroe()];
  const heroe = new Set(borradores.map((b) => b.plazaId));
  for (const plaza of plazas) {
    const suyos = porPlaza.get(plaza.id) ?? [];
    if (heroe.has(plaza.id) || plaza.estatus !== "EN_OPERACION" || suyos.length === 0)
      continue;
    const cantidad = rng.entero(3, 8);
    for (let i = 0; i < cantidad; i++)
      borradores.push(crearBorrador(rng, plaza, suyos, i));
  }

  return borradores
    .map((b, orden) => ({ b, orden }))
    .sort(
      (x, y) =>
        x.b.fechaProgramada.localeCompare(y.b.fechaProgramada) || x.orden - y.orden,
    )
    .map(({ b }, i) => {
      const consecutivo = i + 1;
      return {
        ...b,
        id: `mnt-${String(consecutivo).padStart(4, "0")}`,
        folio: formatearFolio(Number(b.fechaProgramada.slice(0, 4)), consecutivo),
      };
    });
}
