import { diasEntre } from "./fechas";
import type {
  CategoriaMantenimiento,
  EstatusMantenimiento,
  FechaISO,
  Foto,
  FacturaSat,
  Local,
  Mantenimiento,
  PresupuestoMantenimiento,
  Proveedor,
  TipoMantenimiento,
} from "./tipos";

export const TIPOS_MANTENIMIENTO: readonly TipoMantenimiento[] = [
  "PREVENTIVO",
  "CORRECTIVO",
];

/** Estatus en el orden del flujo. */
export const ESTATUS_MANTENIMIENTO: readonly EstatusMantenimiento[] = [
  "PROGRAMADO",
  "EN_PROCESO",
  "FINALIZADO",
  "CANCELADO",
];

export const CATEGORIAS_MANTENIMIENTO: readonly CategoriaMantenimiento[] = [
  "PINTURA",
  "IMPERMEABILIZACION",
  "ELECTRICO",
  "PLOMERIA",
  "CLIMA",
  "LIMPIEZA",
];

export const ETIQUETA_TIPO_MANTENIMIENTO: Readonly<Record<TipoMantenimiento, string>> = {
  PREVENTIVO: "Preventivo",
  CORRECTIVO: "Correctivo",
};

export const ETIQUETA_ESTATUS_MANTENIMIENTO: Readonly<
  Record<EstatusMantenimiento, string>
> = {
  PROGRAMADO: "Programado",
  EN_PROCESO: "En proceso",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const ETIQUETA_CATEGORIA_MANTENIMIENTO: Readonly<
  Record<CategoriaMantenimiento, string>
> = {
  PINTURA: "Pintura",
  IMPERMEABILIZACION: "Impermeabilización",
  ELECTRICO: "Eléctrico",
  PLOMERIA: "Plomería",
  CLIMA: "Clima",
  LIMPIEZA: "Limpieza",
};

// --- invariantes ----------------------------------------------------------

type DatosInvariantes = Pick<
  Mantenimiento,
  | "tipo"
  | "origen"
  | "estatus"
  | "cargoA"
  | "localId"
  | "categoria"
  | "fechaInicio"
  | "fechaFin"
  | "costoReal"
>;

/** Un preventivo siempre lo programa la administración. */
export function origenValido(m: Pick<Mantenimiento, "tipo" | "origen">): boolean {
  return m.tipo !== "PREVENTIVO" || m.origen === "ADMINISTRACION";
}

/** Cobrar al locatario exige un local concreto y ocupado. */
export function cargoValido(
  m: Pick<Mantenimiento, "cargoA" | "localId">,
  local: Pick<Local, "id" | "estatus"> | undefined,
): boolean {
  if (m.cargoA !== "LOCATARIO") return true;
  return (
    m.localId !== undefined && local?.id === m.localId && local.estatus === "OCUPADO"
  );
}

/** Las fechas y el costo que exige cada estatus. */
export function estatusCompleto(
  m: Pick<Mantenimiento, "estatus" | "fechaInicio" | "fechaFin" | "costoReal">,
): boolean {
  if (m.estatus === "EN_PROCESO") return m.fechaInicio !== undefined;
  if (m.estatus !== "FINALIZADO") return true;
  return (
    m.fechaInicio !== undefined &&
    m.fechaFin !== undefined &&
    m.fechaFin >= m.fechaInicio &&
    m.costoReal !== undefined
  );
}

/** El proveedor atiende la categoría del trabajo. */
export function proveedorAtiende(
  proveedor: Pick<Proveedor, "especialidades"> | undefined,
  categoria: CategoriaMantenimiento,
): boolean {
  return proveedor?.especialidades.includes(categoria) ?? false;
}

/** Incumplimientos de las invariantes (vacío si el registro es válido). */
export function erroresMantenimiento(
  m: DatosInvariantes,
  contexto: {
    local?: Pick<Local, "id" | "estatus">;
    proveedor?: Pick<Proveedor, "especialidades">;
  },
): string[] {
  const errores: string[] = [];
  if (!origenValido(m))
    errores.push("Un preventivo solo puede venir de la administración.");
  if (!cargoValido(m, contexto.local)) {
    errores.push("Solo se cobra al locatario un trabajo en un local ocupado.");
  }
  if (!estatusCompleto(m)) {
    errores.push(
      m.estatus === "EN_PROCESO"
        ? "Un trabajo en proceso necesita fecha de inicio."
        : "Un trabajo finalizado necesita inicio, fin (no anterior al inicio) y costo real.",
    );
  }
  if (!proveedorAtiende(contexto.proveedor, m.categoria)) {
    errores.push("El proveedor no atiende esta categoría.");
  }
  return errores;
}

// --- transiciones ---------------------------------------------------------

export const TRANSICIONES_MANTENIMIENTO: Readonly<
  Record<EstatusMantenimiento, readonly EstatusMantenimiento[]>
> = {
  PROGRAMADO: ["EN_PROCESO", "CANCELADO"],
  EN_PROCESO: ["FINALIZADO", "CANCELADO"],
  FINALIZADO: [],
  CANCELADO: [],
};

export function puedeTransicionar(
  actual: EstatusMantenimiento,
  destino: EstatusMantenimiento,
): boolean {
  return TRANSICIONES_MANTENIMIENTO[actual].includes(destino);
}

export interface DatosTransicion {
  hoy: FechaISO;
  /** Obligatorio al finalizar (≥ 0). */
  costoReal?: number;
  /** Fotos que se adjuntan en este paso ("antes" al iniciar, "después" al finalizar). */
  evidencia?: readonly Foto[];
}

/**
 * Aplica una transición. Devuelve `undefined` si no está permitida o si faltan
 * datos (finalizar sin costo real válido), para que quien llama deje el estado igual.
 */
export function transicionar(
  m: Mantenimiento,
  destino: EstatusMantenimiento,
  datos: DatosTransicion,
): Mantenimiento | undefined {
  if (!puedeTransicionar(m.estatus, destino)) return undefined;
  if (destino === "EN_PROCESO" && inicioBloqueado(m)) return undefined;
  if (destino === "CANCELADO") return { ...m, estatus: destino };
  const evidencia = [...m.evidencia, ...(datos.evidencia ?? [])];
  if (destino === "EN_PROCESO") {
    return { ...m, estatus: destino, fechaInicio: datos.hoy, evidencia };
  }
  const costo = datos.costoReal;
  if (costo === undefined || !Number.isFinite(costo) || costo < 0) return undefined;
  const fechaInicio = m.fechaInicio ?? datos.hoy;
  if (datos.hoy < fechaInicio) return undefined;
  return {
    ...m,
    estatus: destino,
    fechaInicio,
    fechaFin: datos.hoy,
    costoReal: costo,
    evidencia,
  };
}

// --- consultas ------------------------------------------------------------

/** Programado cuya fecha ya pasó: es un aviso, no un estatus. */
export function estaAtrasado(
  m: Pick<Mantenimiento, "estatus" | "fechaProgramada">,
  hoy: FechaISO,
): boolean {
  return m.estatus === "PROGRAMADO" && m.fechaProgramada < hoy;
}

export function estaAbierto(m: Pick<Mantenimiento, "estatus">): boolean {
  return m.estatus === "PROGRAMADO" || m.estatus === "EN_PROCESO";
}

export interface KpisMantenimiento {
  /** Programados y en proceso. */
  abiertos: number;
  atrasados: number;
  /** Costo real de lo finalizado en el mes de `hoy` a cargo de la plaza. */
  gastoMes: number;
  /** Fracción (0-1) de preventivos sobre lo no cancelado; 0 sin registros. */
  pctPreventivo: number;
}

export function kpisMantenimiento(
  mantenimientos: readonly Mantenimiento[],
  hoy: FechaISO,
): KpisMantenimiento {
  const mes = hoy.slice(0, 7);
  const vigentes = mantenimientos.filter((m) => m.estatus !== "CANCELADO");
  return {
    abiertos: mantenimientos.filter(estaAbierto).length,
    atrasados: mantenimientos.filter((m) => estaAtrasado(m, hoy)).length,
    gastoMes: mantenimientos
      .filter(
        (m) =>
          m.estatus === "FINALIZADO" &&
          m.cargoA === "PLAZA" &&
          m.fechaFin?.slice(0, 7) === mes,
      )
      .reduce((suma, m) => suma + (m.costoReal ?? 0), 0),
    pctPreventivo:
      vigentes.length === 0
        ? 0
        : vigentes.filter((m) => m.tipo === "PREVENTIVO").length / vigentes.length,
  };
}

const PREFIJO_FOLIO = "MNT";

export function formatearFolio(año: number, consecutivo: number): string {
  return `${PREFIJO_FOLIO}-${año}-${String(consecutivo).padStart(4, "0")}`;
}

/** Consecutivo de un folio `MNT-AAAA-NNNN`; `undefined` si no tiene esa forma. */
export function consecutivoDeFolio(folio: string): number | undefined {
  const partes = /^MNT-\d{4}-(\d{4,})$/.exec(folio);
  return partes ? Number(partes[1]) : undefined;
}

/** Folio siguiente al mayor de los existentes, con el año de `hoy`. */
export function siguienteFolio(folios: readonly string[], hoy: FechaISO): string {
  const maximo = folios.reduce(
    (mayor, f) => Math.max(mayor, consecutivoDeFolio(f) ?? 0),
    0,
  );
  return formatearFolio(Number(hoy.slice(0, 4)), maximo + 1);
}

/** Días que lleva atrasado un programado (0 si no lo está). */
export function diasDeAtraso(
  m: Pick<Mantenimiento, "estatus" | "fechaProgramada">,
  hoy: FechaISO,
): number {
  return estaAtrasado(m, hoy) ? diasEntre(m.fechaProgramada, hoy) : 0;
}

/** Mantenimientos de un local (o de toda la plaza si no se pasa `localId`). */
export function filtrarPorUbicacion(
  mantenimientos: readonly Mantenimiento[],
  filtro: { plazaId?: string; localId?: string },
): Mantenimiento[] {
  return mantenimientos.filter(
    (m) =>
      (filtro.plazaId === undefined || m.plazaId === filtro.plazaId) &&
      (filtro.localId === undefined || m.localId === filtro.localId),
  );
}

// --- presupuesto y sobregiro ----------------------------------------------

/** Lo que cuesta el trabajo: el costo real si ya se cerró, si no el estimado. */
export function montoMantenimiento(
  m: Pick<Mantenimiento, "costoReal" | "costoEstimado">,
): number {
  return m.costoReal ?? m.costoEstimado;
}

/**
 * ¿Pesa en el presupuesto? No cuenta lo cancelado ni lo que espera (o perdió)
 * la autorización de un sobregiro: aún no es gasto comprometido.
 */
export function cuentaEnPresupuesto(
  m: Pick<Mantenimiento, "estatus" | "autorizacionSobregiro">,
): boolean {
  if (m.estatus === "CANCELADO") return false;
  const estado = m.autorizacionSobregiro?.estado;
  return estado !== "PENDIENTE" && estado !== "RECHAZADA";
}

/**
 * Consumo del presupuesto de una plaza en un año (por fecha programada).
 * `excluirId` deja fuera un trabajo, para medir contra el resto.
 */
export function consumoPresupuesto(
  plazaId: string,
  año: number,
  mantenimientos: readonly Mantenimiento[],
  excluirId?: string,
): number {
  return mantenimientos
    .filter(
      (m) =>
        m.plazaId === plazaId &&
        m.id !== excluirId &&
        Number(m.fechaProgramada.slice(0, 4)) === año &&
        cuentaEnPresupuesto(m),
    )
    .reduce((suma, m) => suma + montoMantenimiento(m), 0);
}

/** Lo que queda del presupuesto; negativo si ya se pasó. */
export function disponiblePresupuesto(
  presupuesto: Pick<PresupuestoMantenimiento, "monto">,
  consumo: number,
): number {
  return presupuesto.monto - consumo;
}

export type NivelPresupuesto = "NORMAL" | "ALERTA" | "SOBREGIRO";

/** Umbral (fracción) desde el que el consumo se marca como alerta. */
export const UMBRAL_ALERTA_PRESUPUESTO = 0.8;

/** Alerta desde el 80 % del presupuesto; sobregiro solo si se pasa. */
export function nivelPresupuesto(
  presupuesto: Pick<PresupuestoMantenimiento, "monto">,
  consumo: number,
): NivelPresupuesto {
  if (consumo > presupuesto.monto) return "SOBREGIRO";
  return presupuesto.monto > 0 && consumo / presupuesto.monto >= UMBRAL_ALERTA_PRESUPUESTO
    ? "ALERTA"
    : "NORMAL";
}

/**
 * ¿Hace pasar el consumo del presupuesto? `consumo` es el del resto de los
 * trabajos de la plaza (sin este). Sin presupuesto definido no hay tope.
 */
export function requiereAutorizacion(
  m: Pick<Mantenimiento, "costoReal" | "costoEstimado">,
  presupuesto: Pick<PresupuestoMantenimiento, "monto"> | undefined,
  consumo: number,
): boolean {
  return presupuesto !== undefined && consumo + montoMantenimiento(m) > presupuesto.monto;
}

/** Cuánto se pasa el trabajo del presupuesto (0 si cabe). */
export function excedenteSobregiro(
  m: Pick<Mantenimiento, "costoReal" | "costoEstimado">,
  presupuesto: Pick<PresupuestoMantenimiento, "monto">,
  consumo: number,
): number {
  return Math.max(0, consumo + montoMantenimiento(m) - presupuesto.monto);
}

/** Un sobregiro que no está autorizado impide iniciar el trabajo. */
export function inicioBloqueado(
  m: Pick<Mantenimiento, "autorizacionSobregiro">,
): boolean {
  const autorizacion = m.autorizacionSobregiro;
  return autorizacion !== undefined && autorizacion.estado !== "AUTORIZADA";
}

/** Deja el trabajo esperando la autorización de Dirección. */
export function solicitarSobregiro(
  m: Mantenimiento,
  datos: { solicitadoPor: string; hoy: FechaISO; excedente: number },
): Mantenimiento {
  return {
    ...m,
    autorizacionSobregiro: {
      estado: "PENDIENTE",
      solicitadoPor: datos.solicitadoPor,
      solicitadoEl: datos.hoy,
      excedente: datos.excedente,
    },
  };
}

/**
 * Dirección resuelve un sobregiro pendiente. Rechazar exige comentario; autorizar
 * lo admite opcional. Devuelve `undefined` si no está pendiente o falta el comentario.
 */
export function resolverSobregiro(
  m: Mantenimiento,
  decision: "AUTORIZADA" | "RECHAZADA",
  datos: { resueltoPor: string; hoy: FechaISO; comentario?: string },
): Mantenimiento | undefined {
  const actual = m.autorizacionSobregiro;
  if (actual?.estado !== "PENDIENTE") return undefined;
  const comentario = datos.comentario?.trim() || undefined;
  if (decision === "RECHAZADA" && comentario === undefined) return undefined;
  return {
    ...m,
    autorizacionSobregiro: {
      ...actual,
      estado: decision,
      resueltoPor: datos.resueltoPor,
      resueltoEl: datos.hoy,
      comentario,
    },
  };
}

// --- facturas SAT ---------------------------------------------------------

/** Facturas de la plaza que aún no están ligadas a ningún trabajo. */
export function facturasSinLigar(
  facturas: readonly FacturaSat[],
  plazaId: string,
): FacturaSat[] {
  return facturas.filter((f) => f.plazaId === plazaId && f.mantenimientoId === undefined);
}

/** Facturas ligadas a un mantenimiento. */
export function facturasDeMantenimiento(
  facturas: readonly FacturaSat[],
  mantenimientoId: string,
): FacturaSat[] {
  return facturas.filter((f) => f.mantenimientoId === mantenimientoId);
}

/** UUID abreviado para tablas: los primeros 8 caracteres. */
export function uuidCorto(uuid: string): string {
  return uuid.slice(0, 8).toUpperCase();
}
