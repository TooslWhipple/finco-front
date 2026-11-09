import type { Estatus, TonoChip, TonoKpi } from "@/components/shared";
import {
  acumuladoComprometido,
  alertasObra,
  avanceFisicoContrato,
  avancePlaneadoContrato,
  avancePlaneadoProyecto,
  curvaS,
  diasEntre,
  ETIQUETA_FASE,
  FASES_CRONOGRAMA,
  indicadoresContrato,
  indicadoresObra,
  lunesDeSemana,
  montoContrato,
  semaforoDeIndice,
  sumarDias,
  presupuestoProyecto,
  type ActividadCronograma,
  type AlertaObra,
  type ConceptoObra,
  type ContratoObra,
  type CorteSemanal,
  type EstadoCorte,
  type FaseCronograma,
  type FechaISO,
  type IndicadoresContrato,
  type IndicadoresObra,
  type PagoObra,
  type PuntoCurvaS,
  type SemaforoTerreno,
} from "@/domain";

export interface KpisExpediente {
  presupuesto: number;
  contratos: number;
  /** Avance planeado a la fecha, fracción 0-1. */
  avancePlaneado: number;
}

export function kpisExpediente(
  contratos: readonly ContratoObra[],
  hoy: FechaISO,
): KpisExpediente {
  return {
    presupuesto: presupuestoProyecto(contratos),
    contratos: contratos.length,
    avancePlaneado: avancePlaneadoProyecto(contratos, hoy),
  };
}

export interface FilaContrato {
  contrato: ContratoObra;
  monto: number;
  /** Fracción 0-1 que el contrato debería llevar a la fecha. */
  avancePlaneado: number;
}

/** Contratos con su monto y avance planeado, por fecha de inicio. */
export function filasContratos(
  contratos: readonly ContratoObra[],
  hoy: FechaISO,
): FilaContrato[] {
  return contratos
    .map((contrato) => ({
      contrato,
      monto: montoContrato(contrato),
      avancePlaneado: avancePlaneadoContrato(contrato, hoy),
    }))
    .toSorted((a, b) => a.contrato.inicioPlan.localeCompare(b.contrato.inicioPlan));
}

/** Tramo de una barra: columna inicial (1 = primera semana) y semanas que ocupa. */
export interface TramoGantt {
  columna: number;
  semanas: number;
}

export interface FilaGantt {
  id: string;
  etiqueta: string;
  plan: TramoGantt;
  /** Tramo real: de su inicio real a su fin real, o a hoy si sigue en curso. */
  real?: TramoGantt;
}

export interface GrupoGantt {
  fase: FaseCronograma;
  etiqueta: string;
  filas: FilaGantt[];
}

export interface EncabezadoSemana {
  columna: number;
  /** Fecha de inicio de la semana, solo cada cuatro semanas para no saturar. */
  etiqueta?: FechaISO;
}

export interface ViewModelGantt {
  semanas: number;
  encabezados: EncabezadoSemana[];
  /** Columna de la semana que contiene a hoy. */
  columnaHoy: number;
  grupos: GrupoGantt[];
}

const SEMANAS_ENTRE_ETIQUETAS = 4;

/** Posiciona cada actividad del cronograma en semanas, listo para pintarse con CSS grid. */
export function viewModelGantt(
  actividades: readonly ActividadCronograma[],
  hoy: FechaISO,
): ViewModelGantt | null {
  if (actividades.length === 0) return null;
  const fechas = actividades.flatMap((a) => [a.inicioPlan, a.finPlan]);
  const origen = fechas.reduce((min, f) => (f < min ? f : min), hoy);
  const fin = fechas.reduce((max, f) => (f > max ? f : max), hoy);
  const semanaDe = (fecha: FechaISO) => Math.floor(diasEntre(origen, fecha) / 7);
  const tramo = (desde: FechaISO, hasta: FechaISO): TramoGantt => ({
    columna: semanaDe(desde) + 1,
    semanas: Math.max(1, semanaDe(hasta) - semanaDe(desde) + 1),
  });

  const semanas = semanaDe(fin) + 1;
  const encabezados = Array.from({ length: semanas }, (_, i) => ({
    columna: i + 1,
    etiqueta: i % SEMANAS_ENTRE_ETIQUETAS === 0 ? sumarDias(origen, i * 7) : undefined,
  }));

  const grupos = FASES_CRONOGRAMA.map<GrupoGantt>((fase) => ({
    fase,
    etiqueta: ETIQUETA_FASE[fase],
    filas: actividades
      .filter((a) => a.fase === fase)
      .toSorted((a, b) => a.inicioPlan.localeCompare(b.inicioPlan))
      .map<FilaGantt>((a) => ({
        id: a.id,
        etiqueta: a.titulo,
        plan: tramo(a.inicioPlan, a.finPlan),
        real: a.inicioReal ? tramo(a.inicioReal, a.finReal ?? hoy) : undefined,
      })),
  })).filter((g) => g.filas.length > 0);

  return { semanas, encabezados, columnaHoy: semanaDe(hoy) + 1, grupos };
}

// --- cortes semanales -----------------------------------------------------

/** Etiqueta del estado de un corte y el estatus de `StatusChip` que le da el color. */
export const ESTADO_CORTE: Readonly<
  Record<EstadoCorte, { etiqueta: string; estatus: Estatus }>
> = {
  CAPTURADO: { etiqueta: "Capturado", estatus: "BORRADOR" },
  FIRMADO_SUPERVISOR: { etiqueta: "Por validar", estatus: "PENDIENTE" },
  VALIDADO_PMO: { etiqueta: "Validado", estatus: "APROBADO" },
  RECHAZADO: { etiqueta: "Rechazado", estatus: "RECHAZADO" },
};

export type FiltroCortes = "TODOS" | "POR_VALIDAR" | "VALIDADOS" | "RECHAZADOS";

const ESTADOS_DEL_FILTRO: Readonly<Record<FiltroCortes, readonly EstadoCorte[] | null>> =
  {
    TODOS: null,
    POR_VALIDAR: ["CAPTURADO", "FIRMADO_SUPERVISOR"],
    VALIDADOS: ["VALIDADO_PMO"],
    RECHAZADOS: ["RECHAZADO"],
  };

export const OPCIONES_FILTRO_CORTES: readonly {
  valor: FiltroCortes;
  etiqueta: string;
}[] = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "POR_VALIDAR", etiqueta: "Por validar" },
  { valor: "VALIDADOS", etiqueta: "Validados" },
  { valor: "RECHAZADOS", etiqueta: "Rechazados" },
];

export function filtrarCortes(
  cortes: readonly CorteSemanal[],
  filtro: FiltroCortes,
): CorteSemanal[] {
  const estados = ESTADOS_DEL_FILTRO[filtro];
  return estados ? cortes.filter((c) => estados.includes(c.estado)) : [...cortes];
}

export function conteoCortes(
  cortes: readonly CorteSemanal[],
  filtro: FiltroCortes,
): number {
  return filtrarCortes(cortes, filtro).length;
}

export interface FilaCorte {
  corte: CorteSemanal;
  contrato: ContratoObra;
  /** Importe ejecutado en la semana (volumen por precio unitario). */
  importe: number;
  /** Avance de la semana como fracción 0-1 del monto del contrato. */
  avanceSemana: number;
}

function importeCorte(corte: CorteSemanal, contrato: ContratoObra): number {
  return corte.volumenes.reduce((suma, v) => {
    const concepto = contrato.conceptos.find((c) => c.id === v.conceptoId);
    return suma + v.volumen * (concepto?.precioUnitario ?? 0);
  }, 0);
}

/** Filas de la tabla de cortes, de la semana más reciente a la más antigua. */
export function filasCortes(
  cortes: readonly CorteSemanal[],
  contratos: readonly ContratoObra[],
): FilaCorte[] {
  return cortes
    .flatMap((corte) => {
      const contrato = contratos.find((c) => c.id === corte.contratoObraId);
      if (!contrato) return [];
      const importe = importeCorte(corte, contrato);
      const monto = montoContrato(contrato);
      return [
        { corte, contrato, importe, avanceSemana: monto > 0 ? importe / monto : 0 },
      ];
    })
    .toSorted(
      (a, b) =>
        b.corte.semana.localeCompare(a.corte.semana) ||
        b.corte.id.localeCompare(a.corte.id),
    );
}

export interface FilaVolumenCorte {
  concepto: ConceptoObra;
  /** Volumen de esa semana. */
  semana: number;
  /** Acumulado de los cortes vivos hasta esa semana, inclusive. */
  acumulado: number;
}

/** Volúmenes de un corte contra el acumulado de su contrato a esa semana. */
export function volumenesDeCorte(
  corte: CorteSemanal,
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
): FilaVolumenCorte[] {
  const hastaSemana = cortes.filter(
    (c) => c.contratoObraId === contrato.id && c.semana <= corte.semana,
  );
  const acumulado = acumuladoComprometido(contrato.id, hastaSemana);
  return contrato.conceptos.map((concepto) => ({
    concepto,
    semana: corte.volumenes.find((v) => v.conceptoId === concepto.id)?.volumen ?? 0,
    acumulado: acumulado[concepto.id] ?? 0,
  }));
}

export interface EventoCorte {
  id: string;
  titulo: string;
  detalle?: string;
  fecha: FechaISO;
  tono: TonoChip;
}

/** Trazabilidad del corte: capturó y firmó, y luego validó o rechazó. */
export function eventosDeCorte(corte: CorteSemanal): EventoCorte[] {
  const eventos: EventoCorte[] = [
    {
      id: "firma",
      titulo: `${corte.firmadoPor ?? corte.capturadoPor} capturó y firmó`,
      fecha: corte.firmadoEn ?? corte.semana,
      tono: "primario",
    },
  ];
  if (corte.validadoEn && corte.validadoPor) {
    const validado = corte.estado === "VALIDADO_PMO";
    eventos.push({
      id: "resolucion",
      titulo: `${corte.validadoPor} ${validado ? "validó" : "rechazó"}`,
      detalle: corte.comentario,
      fecha: corte.validadoEn,
      tono: validado ? "verde" : "coral",
    });
  }
  return eventos;
}

/** Lunes de las semanas ya cerradas del contrato que aún no tienen un corte vivo. */
export function semanasCapturables(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  hoy: FechaISO,
): FechaISO[] {
  const ultima = sumarDias(lunesDeSemana(hoy), -7);
  const fin =
    lunesDeSemana(contrato.finPlan) < ultima ? lunesDeSemana(contrato.finPlan) : ultima;
  const ocupadas = new Set(
    cortes
      .filter((c) => c.contratoObraId === contrato.id && c.estado !== "RECHAZADO")
      .map((c) => c.semana),
  );
  const semanas: FechaISO[] = [];
  for (let s = lunesDeSemana(contrato.inicioPlan); s <= fin; s = sumarDias(s, 7)) {
    if (!ocupadas.has(s)) semanas.push(s);
  }
  return semanas;
}

/** Contratos con alguna semana por capturar. */
export function contratosCapturables(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  hoy: FechaISO,
): ContratoObra[] {
  return contratos.filter(
    (c) =>
      avanceFisicoContrato(c, cortes, hoy) < 1 &&
      semanasCapturables(c, cortes, hoy).length > 0,
  );
}

export interface FilaCaptura {
  concepto: ConceptoObra;
  /** Acumulado de los cortes vivos antes de esta captura. */
  anterior: number;
  /** Volumen capturado esta semana (0 si el campo está vacío o inválido). */
  semana: number;
  nuevoAcumulado: number;
  /** Fracción 0-1 del volumen contratado con el nuevo acumulado. */
  avance: number;
}

export interface ResumenCaptura {
  filas: FilaCaptura[];
  /** Importe de la semana. */
  importe: number;
  /** Avance del contrato (0-1) incluyendo lo capturado. */
  avanceNuevo: number;
}

const aVolumen = (texto: string | undefined): number => {
  const valor = Number(texto);
  return texto !== undefined && texto.trim() !== "" && Number.isFinite(valor) ? valor : 0;
};

/** Tabla del diálogo de captura: volumen anterior, el de la semana y el nuevo acumulado. */
export function resumenCaptura(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  textos: Readonly<Record<string, string>>,
): ResumenCaptura {
  const previo = acumuladoComprometido(contrato.id, cortes);
  const filas = contrato.conceptos.map<FilaCaptura>((concepto) => {
    const anterior = previo[concepto.id] ?? 0;
    const semana = aVolumen(textos[concepto.id]);
    const nuevoAcumulado = anterior + semana;
    return {
      concepto,
      anterior,
      semana,
      nuevoAcumulado,
      avance:
        concepto.volumenContratado > 0 ? nuevoAcumulado / concepto.volumenContratado : 0,
    };
  });
  const monto = montoContrato(contrato);
  const ganado = filas.reduce(
    (suma, f) =>
      suma +
      Math.min(f.nuevoAcumulado, f.concepto.volumenContratado) *
        f.concepto.precioUnitario,
    0,
  );
  return {
    filas,
    importe: filas.reduce((suma, f) => suma + f.semana * f.concepto.precioUnitario, 0),
    avanceNuevo: monto > 0 ? ganado / monto : 0,
  };
}

// --- valor ganado ---------------------------------------------------------

const TONO_KPI_SEMAFORO: Readonly<Record<SemaforoTerreno, TonoKpi>> = {
  VERDE: "positivo",
  AMARILLO: "alerta",
  ROJO: "peligro",
};

/** Tono de un KPI según el semáforo de su índice (SPI o CPI). */
export function tonoDeIndice(indice: number | null): TonoKpi {
  const semaforo = semaforoDeIndice(indice);
  return semaforo === null ? "neutro" : TONO_KPI_SEMAFORO[semaforo];
}

export interface FilaValorGanado extends IndicadoresContrato {
  semaforoSpi: SemaforoTerreno | null;
  semaforoCpi: SemaforoTerreno | null;
}

export interface ViewModelValorGanado {
  indicadores: IndicadoresObra;
  alertas: AlertaObra[];
  curva: PuntoCurvaS[];
  filas: FilaValorGanado[];
}

/** Todo lo que pinta la pestaña "Valor ganado"; `null` si el proyecto no tiene contratos. */
export function viewModelValorGanado(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  pagos: readonly PagoObra[],
  hoy: FechaISO,
): ViewModelValorGanado | null {
  const indicadores = indicadoresObra(contratos, cortes, pagos, hoy);
  if (!indicadores) return null;
  return {
    indicadores,
    alertas: alertasObra(contratos, cortes, pagos, hoy),
    curva: curvaS(contratos, cortes, pagos, hoy),
    filas: contratos
      .map((c) => indicadoresContrato(c, cortes, pagos, hoy))
      .toSorted((a, b) => a.contrato.inicioPlan.localeCompare(b.contrato.inicioPlan))
      .map((f) => ({
        ...f,
        semaforoSpi: semaforoDeIndice(f.spi),
        semaforoCpi: semaforoDeIndice(f.cpi),
      })),
  };
}
