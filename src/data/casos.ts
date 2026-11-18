import { usuarioDeRol } from "@/config/usuarios";
import {
  contratoVigenteParaApertura,
  diasEntre,
  foliosFacturaDeLocal,
  horasEntre,
  META_PRIMERA_RESPUESTA_HORAS,
  siguienteFolioCaso,
  sumarDias,
  TEXTO_BITACORA_CASO,
  type CanalCaso,
  type CasoServicio,
  type CategoriaMantenimiento,
  type Contrato,
  type EntradaBitacoraCaso,
  type EstatusCaso,
  type Factura,
  type Local,
  type Mantenimiento,
  type PrioridadCaso,
  type TipoCaso,
} from "@/domain";
import { crearPrng, type Prng } from "./prng";

/** PRNG propio de los casos: no altera la secuencia del resto de la semilla. */
export const SEMILLA_CASOS = 7_301;
/** Ventana de la semilla: los casos se abren en los últimos 60 días. */
export const DIAS_CASOS = 60;
/** Casos al azar, además de los fijos, los escalados y las aclaraciones. */
const CASOS_AL_AZAR = 20;
const ESCALADOS = 5;
const ACLARACIONES = 4;
/** Locatarios entre los que se reparten los casos al azar (para que repitan). */
const LOCATARIOS_FRECUENTES = 12;

const CANALES: readonly CanalCaso[] = ["TELEFONO", "CORREO", "WHATSAPP", "PRESENCIAL"];

/** Tipo de caso que corresponde a la categoría del mantenimiento al que se escaló. */
function tipoDeCategoria(categoria: CategoriaMantenimiento): TipoCaso {
  if (categoria === "PLOMERIA") return "FUGA";
  if (categoria === "ELECTRICO") return "FALLA";
  return "DANO";
}

const DESCRIPCIONES: Readonly<Record<TipoCaso, readonly string[]>> = {
  FALLA: [
    "Se fue la luz en el local y el centro de carga no restablece.",
    "La cortina eléctrica del acceso no abre.",
    "El contacto del mostrador hace corto.",
  ],
  FUGA: [
    "Fuga de agua bajo el lavabo del baño del local.",
    "Escurre agua del plafón junto a la entrada.",
    "El medidor de agua corre con todo cerrado.",
  ],
  DANO: [
    "Vidrio del aparador estrellado.",
    "Plafón desprendido en el área de ventas.",
    "La puerta de servicio no cierra: la bisagra está vencida.",
  ],
  ACLARACION_FACTURA: [
    "Pide aclarar el concepto de su factura.",
    "Dice que el importe de la factura no coincide con su contrato.",
    "Solicita reexpedir la factura con otro uso de CFDI.",
  ],
  CONSULTA: [
    "Pregunta por el horario de carga y descarga.",
    "Consulta si puede colocar un anuncio en la fachada.",
    "Quiere saber cómo renovar su contrato.",
  ],
  OTRO: [
    "Reporta ruido del local vecino fuera de horario.",
    "Solicita más cajones de estacionamiento para clientes.",
  ],
};

const RESPUESTAS: readonly string[] = [
  "Recibimos tu reporte; lo estamos revisando.",
  "Ya lo canalizamos con el área responsable.",
  "Te confirmamos la visita del equipo.",
];

const MINUTOS_DIA = 24 * 60;

/** ISO con hora sin zona: `minutos` contados desde la medianoche de `fecha` (puede cruzar días). */
function enMinutos(fecha: string, minutos: number): string {
  const dias = Math.floor(minutos / MINUTOS_DIA);
  const resto = minutos - dias * MINUTOS_DIA;
  const hh = String(Math.floor(resto / 60)).padStart(2, "0");
  const mm = String(resto % 60).padStart(2, "0");
  return `${sumarDias(fecha, dias)}T${hh}:${mm}:00`;
}

/** `fecha` a la hora (decimal) dada. */
function enHora(fecha: string, horas: number): string {
  return enMinutos(fecha, Math.round(horas * 60));
}

/** `iso` desplazado `horas`. */
function mas(iso: string, horas: number): string {
  const fecha = iso.slice(0, 10);
  return enHora(fecha, horasEntre(`${fecha}T00:00`, iso) + horas);
}

interface Ubicacion {
  plazaId: string;
  localId: string;
  locatarioId: string;
}

/** Borrador del caso antes de numerarlo: el ciclo se completa después. */
interface Borrador extends Ubicacion {
  tipo: TipoCaso;
  prioridad: PrioridadCaso;
  canal: CanalCaso;
  descripcion: string;
  abiertoEl: string;
  /** Estatus buscado; baja si el ciclo no cabe antes de `ahora`. */
  estatus: EstatusCaso;
  /** Horas hasta la primera respuesta. */
  horasRespuesta: number;
  /** Horas de la primera respuesta a la resolución. */
  horasResolucion: number;
  mantenimiento?: Pick<Mantenimiento, "id" | "folio">;
  facturaId?: string;
}

/** Horas de respuesta: casi siempre dentro de la meta, a veces fuera. */
function horasDeRespuesta(rng: Prng, prioridad: PrioridadCaso): number {
  const meta = META_PRIMERA_RESPUESTA_HORAS[prioridad];
  const factor = rng.prob(0.8) ? 0.1 + rng.siguiente() * 0.8 : 1.1 + rng.siguiente();
  return meta * factor;
}

function prioridadDe(rng: Prng, tipo: TipoCaso): PrioridadCaso {
  if (tipo === "FUGA") return rng.prob(0.8) ? "ALTA" : "MEDIA";
  if (tipo === "FALLA") return rng.prob(0.5) ? "ALTA" : "MEDIA";
  if (tipo === "DANO") return "MEDIA";
  if (tipo === "OTRO") return "BAJA";
  return rng.prob(0.5) ? "MEDIA" : "BAJA";
}

/** Estatus al azar según la antigüedad: lo viejo casi siempre está cerrado. */
function estatusPorAntiguedad(rng: Prng, dias: number): EstatusCaso {
  if (dias <= 2) return rng.elegir(["RECIBIDO", "EN_ATENCION", "EN_ATENCION"] as const);
  if (dias <= 10) return rng.elegir(["EN_ATENCION", "RESUELTO", "CERRADO"] as const);
  return rng.prob(0.2) ? "RESUELTO" : "CERRADO";
}

function calificacionAlAzar(rng: Prng): NonNullable<CasoServicio["calificacion"]> {
  return rng.elegir([5, 5, 5, 4, 4, 4, 3, 2] as const);
}

/**
 * Completa el ciclo del borrador sin pasar de `ahora`: si la respuesta o la
 * resolución caerían después, el caso se queda en el estatus anterior.
 */
function completar(
  b: Borrador,
  id: string,
  folio: string,
  ahora: string,
  rng: Prng,
): CasoServicio {
  const atiende = usuarioDeRol("ATENCION_CLIENTES");
  const bitacora: EntradaBitacoraCaso[] = [];
  const anotar = (fecha: string, texto: string) =>
    bitacora.push({
      id: `${id}-b${bitacora.length + 1}`,
      fecha,
      autor: atiende.nombre,
      texto,
    });
  anotar(b.abiertoEl, TEXTO_BITACORA_CASO.registrado(b.canal));
  const base: CasoServicio = {
    id,
    folio,
    plazaId: b.plazaId,
    localId: b.localId,
    locatarioId: b.locatarioId,
    tipo: b.tipo,
    prioridad: b.prioridad,
    estatus: "RECIBIDO",
    canal: b.canal,
    descripcion: b.descripcion,
    abiertoEl: b.abiertoEl,
    ...(b.facturaId ? { facturaId: b.facturaId } : {}),
    bitacora,
  };
  const respuesta = mas(b.abiertoEl, b.horasRespuesta);
  if (b.estatus === "RECIBIDO" || respuesta >= ahora) return base;
  anotar(respuesta, TEXTO_BITACORA_CASO.respuesta(rng.elegir(RESPUESTAS)));
  const atendido: CasoServicio = {
    ...base,
    estatus: "EN_ATENCION",
    primeraRespuestaEl: respuesta,
    responsableId: atiende.id,
  };
  if (b.mantenimiento) {
    anotar(mas(respuesta, 1), TEXTO_BITACORA_CASO.escalado(b.mantenimiento.folio));
    atendido.mantenimientoId = b.mantenimiento.id;
  }
  const resuelto = mas(respuesta, b.horasResolucion);
  if (b.estatus === "EN_ATENCION" || resuelto >= ahora) return atendido;
  anotar(resuelto, TEXTO_BITACORA_CASO.estatus("RESUELTO"));
  if (b.estatus === "RESUELTO")
    return { ...atendido, estatus: "RESUELTO", resueltoEl: resuelto };
  const calificacion = calificacionAlAzar(rng);
  const cerrado = mas(resuelto, 2);
  if (cerrado >= ahora) return { ...atendido, estatus: "RESUELTO", resueltoEl: resuelto };
  anotar(cerrado, TEXTO_BITACORA_CASO.estatus("CERRADO", calificacion));
  return { ...atendido, estatus: "CERRADO", resueltoEl: resuelto, calificacion };
}

export interface FuentesCasos {
  locales: readonly Local[];
  contratos: readonly Contrato[];
  facturas: readonly Factura[];
  mantenimientos: readonly Mantenimiento[];
}

/**
 * Casos de servicio de los últimos 60 días, solo en locales con contrato
 * vigente (y con su locatario). Incluye un caso ALTA por vencer fijo (abierto
 * 3,5 horas antes de `ahora`), casos sin respuesta fuera de tiempo, escalados
 * ligados a correctivos de locatario que ya existen (no se crean
 * mantenimientos) y aclaraciones con una factura con folio del local.
 */
export function crearCasos(fuentes: FuentesCasos, ahora: string): CasoServicio[] {
  const rng = crearPrng(SEMILLA_CASOS);
  const hoy = ahora.slice(0, 10);
  const desde = sumarDias(hoy, -DIAS_CASOS);
  const plazaDe = new Map(fuentes.locales.map((l) => [l.id, l.plazaId]));
  const ubicaciones = new Map<string, Ubicacion>();
  for (const c of fuentes.contratos) {
    const plazaId = plazaDe.get(c.localId);
    if (plazaId && contratoVigenteParaApertura(c, hoy))
      ubicaciones.set(c.localId, {
        plazaId,
        localId: c.localId,
        locatarioId: c.locatarioId,
      });
  }
  const vigentes = [...ubicaciones.values()];
  if (vigentes.length === 0) return [];

  const horaDeOficina = () => 8 + rng.siguiente() * 11;
  const borrador = (
    u: Ubicacion,
    tipo: TipoCaso,
    abiertoEl: string,
    estatus: EstatusCaso,
    extra: Partial<Borrador> = {},
  ): Borrador => {
    const prioridad = extra.prioridad ?? prioridadDe(rng, tipo);
    return {
      ...u,
      tipo,
      prioridad,
      canal: rng.elegir(CANALES),
      descripcion: rng.elegir(DESCRIPCIONES[tipo]),
      abiertoEl,
      estatus,
      horasRespuesta: horasDeRespuesta(rng, prioridad),
      horasResolucion: 2 + rng.siguiente() * 70,
      ...extra,
    };
  };

  const borradores: Borrador[] = [
    // Fijos: uno por vencer y dos sin respuesta fuera de tiempo.
    borrador(rng.elegir(vigentes), "FUGA", mas(ahora, -3.5), "RECIBIDO", {
      prioridad: "ALTA",
    }),
    borrador(rng.elegir(vigentes), "FALLA", mas(ahora, -7), "RECIBIDO", {
      prioridad: "ALTA",
    }),
    borrador(rng.elegir(vigentes), "DANO", mas(ahora, -30), "RECIBIDO", {
      prioridad: "MEDIA",
    }),
  ];

  // Escalados: correctivos de locatario del mismo local. El caso se abre antes de
  // la fecha programada (y antes de hoy), dentro de la ventana.
  const correctivos = fuentes.mantenimientos.flatMap((m) => {
    const u = m.localId === undefined ? undefined : ubicaciones.get(m.localId);
    const tope = m.fechaProgramada < hoy ? m.fechaProgramada : hoy;
    return u &&
      m.tipo === "CORRECTIVO" &&
      m.origen === "LOCATARIO" &&
      diasEntre(desde, tope) >= 1
      ? [{ m, u, tope }]
      : [];
  });
  for (const { m, u, tope } of rng.barajar(correctivos).slice(0, ESCALADOS)) {
    const dias = rng.entero(1, Math.min(4, diasEntre(desde, tope)));
    const abiertoEl = enHora(sumarDias(tope, -dias), horaDeOficina());
    const cerrado: EstatusCaso = rng.prob(0.6) ? "CERRADO" : "RESUELTO";
    const estatus: EstatusCaso = m.estatus === "FINALIZADO" ? cerrado : "EN_ATENCION";
    borradores.push(
      borrador(u, tipoDeCategoria(m.categoria), abiertoEl, estatus, {
        mantenimiento: { id: m.id, folio: m.folio },
        // Se responde (y escala) el mismo día: un escalado nunca se queda sin respuesta.
        horasRespuesta: 1 + rng.siguiente() * 3,
      }),
    );
  }

  // Aclaraciones: una factura con folio del local, de un mes no posterior al del caso.
  const conFolio = vigentes.flatMap((u) => {
    const folio = foliosFacturaDeLocal(fuentes.facturas, u.localId, hoy)[0];
    return folio ? [{ u, folio }] : [];
  });
  for (const { u, folio } of rng.barajar(conFolio).slice(0, ACLARACIONES)) {
    const inicio = `${folio.mes}-01` > desde ? `${folio.mes}-01` : desde;
    const fecha = sumarDias(
      inicio,
      rng.entero(0, Math.max(0, diasEntre(inicio, hoy) - 1)),
    );
    borradores.push(
      borrador(
        u,
        "ACLARACION_FACTURA",
        enHora(fecha, horaDeOficina()),
        // Casi todas ya en atención: las aclaraciones son recientes (facturas de noviembre).
        rng.elegir(["EN_ATENCION", "EN_ATENCION", "RESUELTO", "RECIBIDO"] as const),
        { facturaId: folio.id },
      ),
    );
  }

  // Al azar entre unos cuantos locatarios, para que la estadística por cliente repita.
  const frecuentes = rng.barajar(vigentes).slice(0, LOCATARIOS_FRECUENTES);
  const tiposAlAzar: readonly TipoCaso[] = [
    "FALLA",
    "FUGA",
    "DANO",
    "CONSULTA",
    "CONSULTA",
    "OTRO",
  ];
  for (let i = 0; i < CASOS_AL_AZAR; i++) {
    const dias = rng.entero(1, DIAS_CASOS - 1);
    const fecha = sumarDias(hoy, -dias);
    borradores.push(
      borrador(
        rng.elegir(frecuentes),
        rng.elegir(tiposAlAzar),
        enHora(fecha, horaDeOficina()),
        estatusPorAntiguedad(rng, dias),
      ),
    );
  }

  const ordenados = [...borradores].sort((a, b) =>
    a.abiertoEl.localeCompare(b.abiertoEl),
  );
  const casos: CasoServicio[] = [];
  for (const [i, b] of ordenados.entries()) {
    const folio = siguienteFolioCaso(casos, Number(b.abiertoEl.slice(0, 4)));
    casos.push(completar(b, `cas-${String(i + 1).padStart(4, "0")}`, folio, ahora, rng));
  }
  return casos;
}
