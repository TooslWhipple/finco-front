import { diasEntre, lunesDeSemana, sumarDias } from "./fechas";
import type {
  ConceptoObra,
  ContratoObra,
  CorteSemanal,
  EstadoCorte,
  FaseCronograma,
  FechaISO,
  Foto,
  PagoObra,
  PartidaObra,
  SemaforoTerreno,
  Terreno,
  UnidadObra,
  VolumenCorte,
} from "./tipos";

export const ETIQUETA_PARTIDA: Readonly<Record<PartidaObra, string>> = {
  TERRACERIAS: "Terracerías",
  CIMENTACION: "Cimentación",
  ESTRUCTURA: "Estructura",
  MUROS: "Muros",
  INST_HIDRAULICAS: "Instalaciones hidráulicas",
  INST_ELECTRICAS: "Instalaciones eléctricas",
  TECHOS: "Techos",
  ACABADOS: "Acabados",
};

export const ETIQUETA_UNIDAD: Readonly<Record<UnidadObra, string>> = {
  M2: "m²",
  M3: "m³",
  ML: "ml",
  PZA: "pza",
  KG: "kg",
  LOTE: "lote",
};

/** Fases del cronograma, en el orden del recorrido del terreno a la entrega. */
export const FASES_CRONOGRAMA: readonly FaseCronograma[] = [
  "DISENO",
  "PRESUPUESTO",
  "LICITACION",
  "CONSTRUCCION",
  "ENTREGA",
];

export const ETIQUETA_FASE: Readonly<Record<FaseCronograma, string>> = {
  DISENO: "Diseño del proyecto ejecutivo",
  PRESUPUESTO: "Presupuesto",
  LICITACION: "Licitación",
  CONSTRUCCION: "Construcción",
  ENTREGA: "Entrega",
};

/** Importe de un concepto: volumen contratado por precio unitario. */
export function importeConcepto(concepto: ConceptoObra): number {
  return concepto.volumenContratado * concepto.precioUnitario;
}

/** Monto contratado: suma de los importes de sus conceptos. */
export function montoContrato(contrato: ContratoObra): number {
  return contrato.conceptos.reduce((suma, c) => suma + importeConcepto(c), 0);
}

/** Presupuesto del proyecto (BAC): suma de sus contratos. */
export function presupuestoProyecto(contratos: readonly ContratoObra[]): number {
  return contratos.reduce((suma, c) => suma + montoContrato(c), 0);
}

/**
 * Fracción (0-1) del contrato que debería llevarse a `fecha`: distribución
 * lineal entre `inicioPlan` y `finPlan`.
 */
export function avancePlaneadoContrato(
  contrato: Pick<ContratoObra, "inicioPlan" | "finPlan">,
  fecha: FechaISO,
): number {
  const total = diasEntre(contrato.inicioPlan, contrato.finPlan);
  if (total <= 0) return fecha >= contrato.finPlan ? 1 : 0;
  const corrido = diasEntre(contrato.inicioPlan, fecha);
  return Math.min(1, Math.max(0, corrido / total));
}

/** Fracción (0-1) planeada del proyecto a `fecha` (PV), ponderada por el importe de cada contrato. */
export function avancePlaneadoProyecto(
  contratos: readonly ContratoObra[],
  fecha: FechaISO,
): number {
  const total = presupuestoProyecto(contratos);
  if (total <= 0) return 0;
  const planeado = contratos.reduce(
    (suma, c) => suma + montoContrato(c) * avancePlaneadoContrato(c, fecha),
    0,
  );
  return planeado / total;
}

// --- cortes semanales -----------------------------------------------------

/** Tolerancia numérica al comparar volúmenes y denominadores. */
const TOLERANCIA = 1e-9;

/** Días que un corte firmado puede esperar la validación antes de alertar. */
export const DIAS_MAX_VALIDACION = 3;

/** Domingo de la semana de un corte: desde esa fecha su volumen cuenta. */
export function cierreSemana(semana: FechaISO): FechaISO {
  return sumarDias(semana, 6);
}

const redondear2 = (valor: number): number => Math.round(valor * 100) / 100;

/** Solo los cortes validados por la PMO cuentan para el avance. */
export function cortesValidados(cortes: readonly CorteSemanal[]): CorteSemanal[] {
  return cortes.filter((c) => c.estado === "VALIDADO_PMO");
}

function sumarVolumenes(cortes: readonly CorteSemanal[]): Record<string, number> {
  const acumulado: Record<string, number> = {};
  for (const corte of cortes) {
    for (const { conceptoId, volumen } of corte.volumenes) {
      acumulado[conceptoId] = (acumulado[conceptoId] ?? 0) + volumen;
    }
  }
  return acumulado;
}

/**
 * Volumen validado por concepto de un contrato. Con `fecha`, solo los cortes
 * cuya semana ya cerró a esa fecha.
 */
export function acumuladoValidado(
  contratoId: string,
  cortes: readonly CorteSemanal[],
  fecha?: FechaISO,
): Record<string, number> {
  return sumarVolumenes(
    cortesValidados(cortes).filter(
      (c) =>
        c.contratoObraId === contratoId &&
        (fecha === undefined || cierreSemana(c.semana) <= fecha),
    ),
  );
}

/** Volumen por concepto de los cortes que siguen vivos (todo menos los rechazados). */
export function acumuladoComprometido(
  contratoId: string,
  cortes: readonly CorteSemanal[],
): Record<string, number> {
  return sumarVolumenes(
    cortes.filter((c) => c.contratoObraId === contratoId && c.estado !== "RECHAZADO"),
  );
}

/** Valor ganado (EV) del contrato: volumen validado por precio unitario. */
export function valorGanadoContrato(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  fecha: FechaISO,
): number {
  const acumulado = acumuladoValidado(contrato.id, cortes, fecha);
  return contrato.conceptos.reduce(
    (suma, c) =>
      suma + Math.min(acumulado[c.id] ?? 0, c.volumenContratado) * c.precioUnitario,
    0,
  );
}

/** Avance físico (0-1) del contrato: valor ganado sobre su monto. */
export function avanceFisicoContrato(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  fecha: FechaISO,
): number {
  const monto = montoContrato(contrato);
  return monto > TOLERANCIA ? valorGanadoContrato(contrato, cortes, fecha) / monto : 0;
}

/** Costo real (AC) del contrato: lo pagado hasta `fecha`. */
export function costoRealContrato(
  contrato: ContratoObra,
  pagos: readonly PagoObra[],
  fecha: FechaISO,
): number {
  return pagos
    .filter((p) => p.contratoObraId === contrato.id && p.fecha <= fecha)
    .reduce((suma, p) => suma + p.monto, 0);
}

// --- captura, validación y transiciones -----------------------------------

/** Lo que captura el Supervisor: volumen de la semana, no el acumulado. */
export interface EntradaCorte {
  contratoObraId: string;
  semana: FechaISO;
  volumenes: readonly VolumenCorte[];
}

export interface ErroresCorte {
  semana?: string;
  /** Error por id de concepto, para mostrarlo en su propio campo. */
  volumenes: Record<string, string>;
  general?: string;
}

/** Valida una captura contra el contrato y los cortes existentes. */
export function erroresCorte(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  entrada: EntradaCorte,
): ErroresCorte {
  const errores: ErroresCorte = { volumenes: {} };
  if (lunesDeSemana(entrada.semana) !== entrada.semana) {
    errores.semana = "La semana debe empezar en lunes.";
  } else if (
    cortes.some(
      (c) =>
        c.contratoObraId === contrato.id &&
        c.semana === entrada.semana &&
        c.estado !== "RECHAZADO",
    )
  ) {
    errores.semana = "Ya hay un corte de esta semana para el contrato.";
  }

  const previo = acumuladoComprometido(contrato.id, cortes);
  let hayVolumen = false;
  for (const concepto of contrato.conceptos) {
    const volumen =
      entrada.volumenes.find((v) => v.conceptoId === concepto.id)?.volumen ?? 0;
    if (!Number.isFinite(volumen) || volumen < 0) {
      errores.volumenes[concepto.id] = "Escribe un volumen de 0 o más.";
      continue;
    }
    if (volumen > TOLERANCIA) hayVolumen = true;
    const restante = concepto.volumenContratado - (previo[concepto.id] ?? 0);
    if (volumen > restante + TOLERANCIA) {
      errores.volumenes[concepto.id] =
        `Excede lo contratado: quedan ${redondear2(Math.max(0, restante))} ${ETIQUETA_UNIDAD[concepto.unidad]}.`;
    }
  }
  if (!hayVolumen && Object.keys(errores.volumenes).length === 0) {
    errores.general = "Captura el volumen de al menos un concepto.";
  }
  return errores;
}

/** `true` si la captura no tiene ningún error. */
export function corteSinErrores(errores: ErroresCorte): boolean {
  return (
    errores.semana === undefined &&
    errores.general === undefined &&
    Object.keys(errores.volumenes).length === 0
  );
}

/** Capturar y firmar es una sola acción: no hay borradores, el corte nace firmado. */
export function firmarCorte(
  id: string,
  entrada: EntradaCorte,
  autor: string,
  fecha: FechaISO,
  evidencia: Foto[],
): CorteSemanal {
  return {
    id,
    contratoObraId: entrada.contratoObraId,
    semana: entrada.semana,
    volumenes: entrada.volumenes
      .filter((v) => v.volumen > TOLERANCIA)
      .map(({ conceptoId, volumen }) => ({ conceptoId, volumen })),
    estado: "FIRMADO_SUPERVISOR",
    capturadoPor: autor,
    firmadoPor: autor,
    firmadoEn: fecha,
    evidencia,
  };
}

const TRANSICIONES_CORTE: Readonly<Record<EstadoCorte, readonly EstadoCorte[]>> = {
  CAPTURADO: ["FIRMADO_SUPERVISOR"],
  FIRMADO_SUPERVISOR: ["VALIDADO_PMO", "RECHAZADO"],
  VALIDADO_PMO: [],
  RECHAZADO: [],
};

export function puedeTransitarCorte(origen: EstadoCorte, destino: EstadoCorte): boolean {
  return TRANSICIONES_CORTE[origen].includes(destino);
}

/**
 * Resolución de la PMO sobre un corte firmado. Rechazar exige comentario; una
 * transición no permitida devuelve el mismo corte (los validados son inmutables).
 */
export function resolverCorte(
  corte: CorteSemanal,
  resolucion: "VALIDADO_PMO" | "RECHAZADO",
  autor: string,
  fecha: FechaISO,
  comentario?: string,
): CorteSemanal {
  if (!puedeTransitarCorte(corte.estado, resolucion)) return corte;
  const nota = comentario?.trim();
  if (resolucion === "RECHAZADO" && !nota) return corte;
  return {
    ...corte,
    estado: resolucion,
    validadoPor: autor,
    validadoEn: fecha,
    ...(nota ? { comentario: nota } : {}),
  };
}

// --- indicadores de valor ganado ------------------------------------------

/** División segura: sin denominador positivo no hay resultado. */
function dividir(numerador: number, denominador: number): number | null {
  return denominador > TOLERANCIA ? numerador / denominador : null;
}

export interface IndicadoresObra {
  /** Presupuesto al término (BAC). */
  presupuesto: number;
  avancePlaneado: number;
  avanceFisico: number;
  /** Valor planeado. */
  pv: number;
  /** Valor ganado. */
  ev: number;
  /** Costo real. */
  ac: number;
  spi: number | null;
  cpi: number | null;
  /** Estimado al término: BAC / CPI. */
  eac: number | null;
  /** 1 - SPI: fracción de tiempo perdida. */
  desfaseTiempo: number | null;
  inicio: FechaISO;
  /** Término planeado de la obra: el último fin de contrato. */
  finPlan: FechaISO;
  fechaProyectada: FechaISO | null;
  /** Días entre el término planeado y el proyectado (negativo si se adelanta). */
  diasRetraso: number | null;
}

/** Obra terminada: ya no se proyecta una fecha de término. */
const OBRA_COMPLETA = 0.999;

/** Indicadores del proyecto a `fecha`; `null` si no tiene contratos. */
export function indicadoresObra(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  pagos: readonly PagoObra[],
  fecha: FechaISO,
): IndicadoresObra | null {
  if (contratos.length === 0) return null;
  const presupuesto = presupuestoProyecto(contratos);
  const avancePlaneado = avancePlaneadoProyecto(contratos, fecha);
  const pv = avancePlaneado * presupuesto;
  const ev = contratos.reduce((s, c) => s + valorGanadoContrato(c, cortes, fecha), 0);
  const ac = contratos.reduce((s, c) => s + costoRealContrato(c, pagos, fecha), 0);
  const spi = dividir(ev, pv);
  const cpi = dividir(ev, ac);
  const inicio = contratos.reduce(
    (m, c) => (c.inicioPlan < m ? c.inicioPlan : m),
    contratos[0].inicioPlan,
  );
  const finPlan = contratos.reduce(
    (m, c) => (c.finPlan > m ? c.finPlan : m),
    contratos[0].finPlan,
  );
  const avanceFisico = dividir(ev, presupuesto) ?? 0;
  const duracion = diasEntre(inicio, finPlan);
  const proyectada =
    spi !== null && spi > TOLERANCIA && avanceFisico < OBRA_COMPLETA
      ? sumarDias(inicio, Math.round(duracion / spi))
      : null;
  return {
    presupuesto,
    avancePlaneado,
    avanceFisico,
    pv,
    ev,
    ac,
    spi,
    cpi,
    eac: cpi === null ? null : dividir(presupuesto, cpi),
    desfaseTiempo: spi === null ? null : 1 - spi,
    inicio,
    finPlan,
    fechaProyectada: proyectada,
    diasRetraso: proyectada === null ? null : diasEntre(finPlan, proyectada),
  };
}

export interface IndicadoresContrato {
  contrato: ContratoObra;
  avancePlaneado: number;
  avanceFisico: number;
  pv: number;
  ev: number;
  ac: number;
  spi: number | null;
  cpi: number | null;
}

export function indicadoresContrato(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  pagos: readonly PagoObra[],
  fecha: FechaISO,
): IndicadoresContrato {
  const avancePlaneado = avancePlaneadoContrato(contrato, fecha);
  const pv = avancePlaneado * montoContrato(contrato);
  const ev = valorGanadoContrato(contrato, cortes, fecha);
  const ac = costoRealContrato(contrato, pagos, fecha);
  return {
    contrato,
    avancePlaneado,
    avanceFisico: avanceFisicoContrato(contrato, cortes, fecha),
    pv,
    ev,
    ac,
    spi: dividir(ev, pv),
    cpi: dividir(ev, ac),
  };
}

export type PuntoCurvaS = {
  fecha: FechaISO;
  pv: number;
  /** `null` después de la fecha de corte (aún no ocurre). */
  ev: number | null;
  ac: number | null;
};

/**
 * Curva S semanal: PV de todo el plan, EV y AC hasta `fechaCorte`. Siempre incluye
 * un punto en `fechaCorte` y otro en el término planeado.
 */
export function curvaS(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  pagos: readonly PagoObra[],
  fechaCorte: FechaISO,
): PuntoCurvaS[] {
  const indicadores = indicadoresObra(contratos, cortes, pagos, fechaCorte);
  if (!indicadores) return [];
  const fechas = new Set<FechaISO>([fechaCorte, indicadores.finPlan]);
  for (
    let f = lunesDeSemana(indicadores.inicio);
    f < indicadores.finPlan;
    f = sumarDias(f, 7)
  ) {
    fechas.add(f);
  }
  return [...fechas].toSorted().map((fecha) => {
    const pasado = fecha <= fechaCorte;
    return {
      fecha,
      pv: avancePlaneadoProyecto(contratos, fecha) * indicadores.presupuesto,
      ev: pasado
        ? contratos.reduce((s, c) => s + valorGanadoContrato(c, cortes, fecha), 0)
        : null,
      ac: pasado
        ? contratos.reduce((s, c) => s + costoRealContrato(c, pagos, fecha), 0)
        : null,
    };
  });
}

// --- alertas --------------------------------------------------------------

export type NivelAlerta = "AMBAR" | "ROJO";

export type TipoAlerta =
  "RETRASO_CONTRATO" | "SPI" | "CPI" | "FECHA" | "SIN_REPORTE" | "VALIDACION_PENDIENTE";

export interface AlertaObra {
  id: string;
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  texto: string;
  contratoObraId?: string;
}

const UMBRAL_AMBAR = 0.95;
const UMBRAL_ROJO = 0.85;

const ORDEN_TIPO_ALERTA: Readonly<Record<TipoAlerta, number>> = {
  RETRASO_CONTRATO: 0,
  SPI: 1,
  CPI: 2,
  FECHA: 3,
  SIN_REPORTE: 4,
  VALIDACION_PENDIENTE: 5,
};

/** Nivel de un índice (SPI o CPI): bajo 0.85 rojo, bajo 0.95 ámbar. */
function nivelDeIndice(indice: number | null): NivelAlerta | null {
  if (indice === null || indice >= UMBRAL_AMBAR) return null;
  return indice < UMBRAL_ROJO ? "ROJO" : "AMBAR";
}

/** Semáforo de un índice (SPI o CPI): verde desde 0.95, amarillo desde 0.85 y rojo por debajo; sin dato, `null`. */
export function semaforoDeIndice(indice: number | null): SemaforoTerreno | null {
  if (indice === null) return null;
  const nivel = nivelDeIndice(indice);
  if (nivel === null) return "VERDE";
  return nivel === "ROJO" ? "ROJO" : "AMARILLO";
}

const pesos = (valor: number): string => `$${valor.toFixed(2)}`;
const porcentaje = (fraccion: number): string => `${Math.round(fraccion * 100)}%`;

/** Contrato en ejecución que no se ha terminado: debe reportar cada semana. */
function esContratoActivo(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  semanaPrevia: FechaISO,
  fecha: FechaISO,
): boolean {
  return (
    contrato.inicioPlan <= cierreSemana(semanaPrevia) &&
    contrato.finPlan >= semanaPrevia &&
    avanceFisicoContrato(contrato, cortes, fecha) < OBRA_COMPLETA
  );
}

/** Contratos activos que aún no tienen corte (vigente) de la semana anterior: lo que el Supervisor debe capturar. */
export function contratosSinCaptura(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  fecha: FechaISO,
): ContratoObra[] {
  const semanaPrevia = sumarDias(lunesDeSemana(fecha), -7);
  return contratos.filter(
    (contrato) =>
      esContratoActivo(contrato, cortes, semanaPrevia, fecha) &&
      !cortes.some(
        (c) =>
          c.contratoObraId === contrato.id &&
          c.semana === semanaPrevia &&
          c.estado !== "RECHAZADO",
      ),
  );
}

/** Contrato con el mayor rezago en importe (PV - EV) entre los que van bajo el umbral. */
function contratoMasRetrasado(
  filas: readonly IndicadoresContrato[],
): IndicadoresContrato | null {
  return filas
    .filter((f) => nivelDeIndice(f.spi) !== null)
    .reduce<IndicadoresContrato | null>(
      (peor, f) => (peor === null || f.pv - f.ev > peor.pv - peor.ev ? f : peor),
      null,
    );
}

/**
 * Alertas de la obra a `fecha`, de la más grave a la menos: rojas primero y, dentro
 * de cada nivel, la que señala el contrato más retrasado.
 */
export function alertasObra(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  pagos: readonly PagoObra[],
  fecha: FechaISO,
): AlertaObra[] {
  const proyecto = indicadoresObra(contratos, cortes, pagos, fecha);
  if (!proyecto) return [];
  const alertas: AlertaObra[] = [];

  const nivelSpi = nivelDeIndice(proyecto.spi);
  if (nivelSpi && proyecto.spi !== null) {
    alertas.push({
      id: "spi",
      tipo: "SPI",
      nivel: nivelSpi,
      texto: `Vamos más lento de lo planeado: por cada $1 de obra que debíamos llevar, llevamos ${pesos(proyecto.spi)}.`,
    });
  }
  const nivelCpi = nivelDeIndice(proyecto.cpi);
  if (nivelCpi && proyecto.cpi !== null) {
    alertas.push({
      id: "cpi",
      tipo: "CPI",
      nivel: nivelCpi,
      texto: `Estamos gastando de más: cada $1 de obra ganada nos cuesta ${pesos(1 / proyecto.cpi)}.`,
    });
  }
  if (proyecto.diasRetraso !== null && proyecto.diasRetraso > 0) {
    alertas.push({
      id: "fecha",
      tipo: "FECHA",
      nivel: "ROJO",
      texto: `Al ritmo actual la obra termina ${proyecto.diasRetraso} días después de lo planeado.`,
    });
  }

  const filas = contratos.map((c) => indicadoresContrato(c, cortes, pagos, fecha));
  const peor = contratoMasRetrasado(filas);
  const nivelPeor = peor ? nivelDeIndice(peor.spi) : null;
  if (peor && nivelPeor) {
    alertas.push({
      id: `retraso-${peor.contrato.id}`,
      tipo: "RETRASO_CONTRATO",
      nivel: nivelPeor,
      contratoObraId: peor.contrato.id,
      texto: `El mayor retraso está en ${ETIQUETA_PARTIDA[peor.contrato.partida]} (${peor.contrato.folio}): lleva ${porcentaje(peor.avanceFisico)} y debería llevar ${porcentaje(peor.avancePlaneado)}.`,
    });
  }

  const semanaPrevia = sumarDias(lunesDeSemana(fecha), -7);
  for (const contrato of contratos) {
    if (!esContratoActivo(contrato, cortes, semanaPrevia, fecha)) continue;
    const reportado = cortes.some(
      (c) =>
        c.contratoObraId === contrato.id &&
        c.semana === semanaPrevia &&
        c.estado === "VALIDADO_PMO",
    );
    if (reportado) continue;
    alertas.push({
      id: `sin-reporte-${contrato.id}`,
      tipo: "SIN_REPORTE",
      nivel: "AMBAR",
      contratoObraId: contrato.id,
      texto: `${contrato.folio} · ${ETIQUETA_PARTIDA[contrato.partida]}: sin reporte semanal validado de la semana anterior.`,
    });
  }

  const idsContratos = new Set(contratos.map((c) => c.id));
  for (const corte of cortes) {
    if (corte.estado !== "FIRMADO_SUPERVISOR" || !idsContratos.has(corte.contratoObraId))
      continue;
    const espera = corte.firmadoEn ? diasEntre(corte.firmadoEn, fecha) : 0;
    if (espera <= DIAS_MAX_VALIDACION) continue;
    const contrato = contratos.find((c) => c.id === corte.contratoObraId);
    alertas.push({
      id: `validacion-${corte.id}`,
      tipo: "VALIDACION_PENDIENTE",
      nivel: "AMBAR",
      contratoObraId: corte.contratoObraId,
      texto: `${contrato?.folio ?? corte.contratoObraId}: un corte firmado lleva ${espera} días esperando validación de la PMO.`,
    });
  }

  return alertas.toSorted(
    (a, b) =>
      Number(b.nivel === "ROJO") - Number(a.nivel === "ROJO") ||
      ORDEN_TIPO_ALERTA[a.tipo] - ORDEN_TIPO_ALERTA[b.tipo],
  );
}

/** Semáforo del proyecto: rojo si hay una alerta roja, amarillo si hay alguna, verde si no. */
export function semaforoDeAlertas(alertas: readonly AlertaObra[]): SemaforoTerreno {
  if (alertas.some((a) => a.nivel === "ROJO")) return "ROJO";
  return alertas.length > 0 ? "AMARILLO" : "VERDE";
}

export interface ResumenObra {
  /** Avance físico validado, 0-100. */
  avancePct: number;
  semaforo: SemaforoTerreno;
  alertas: number;
}

/** Avance y semáforo derivados de la obra; `null` si el terreno no tiene contratos. */
export function resumenObra(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  pagos: readonly PagoObra[],
  fecha: FechaISO,
): ResumenObra | null {
  const indicadores = indicadoresObra(contratos, cortes, pagos, fecha);
  if (!indicadores) return null;
  const alertas = alertasObra(contratos, cortes, pagos, fecha);
  return {
    avancePct: Math.round(indicadores.avanceFisico * 100),
    semaforo: semaforoDeAlertas(alertas),
    alertas: alertas.length,
  };
}

/** El terreno con su avance y semáforo derivados de la obra (sin resumen, intacto). */
export function aplicarResumenObra(
  terreno: Terreno,
  resumen: ResumenObra | null,
): Terreno {
  return resumen
    ? { ...terreno, avancePct: resumen.avancePct, semaforoObra: resumen.semaforo }
    : terreno;
}
