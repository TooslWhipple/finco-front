import {
  DEMO_TODAY,
  ETAPAS_PROSPECTO,
  sumarDias,
  type ActividadProspecto,
  diasSinContacto,
  prospectoActivo,
  temperaturaProspecto,
  type Contrato,
  type Cotizacion,
  type EtapaProspecto,
  type Local,
  type Locatario,
  type OrigenProspecto,
  type Prospecto,
} from "@/domain";
import { GIROS, MARCAS } from "./catalogo";
import { LOCAL_HEROE, PLAZA_HEROE_ID } from "./heroe";
import { crearPrng, type Prng } from "./prng";
import { vendedorDeProspecto } from "./vendedores";

const SEMILLA_PROSPECTOS = 4_117;

/** Prospectos sin cotización por etapa (con las 22 cotizaciones del seed suman unos 60). */
const SIN_COTIZACION: ReadonlyArray<readonly [EtapaProspecto, number]> = [
  ["NUEVO", 10],
  ["CONTACTADO", 9],
  ["VISITA", 8],
  ["GANADO", 6],
  ["PERDIDO", 5],
];

const ORIGENES: readonly OrigenProspecto[] = [
  "REFERIDO",
  "SITIO_WEB",
  "LLAMADA",
  "REDES",
  "BROKER",
  "EVENTO",
];

const TEXTO_ORIGEN: Record<OrigenProspecto, string> = {
  REFERIDO: "referido por un locatario",
  SITIO_WEB: "formulario del sitio web",
  LLAMADA: "llamada entrante",
  REDES: "redes sociales",
  BROKER: "broker inmobiliario",
  EVENTO: "evento comercial",
};

const NOMBRES = ["Mariana", "Luis", "Fernanda", "Ricardo", "Daniela", "Héctor", "Paola"];
const APELLIDOS = [
  "Salgado",
  "Beltrán",
  "Ochoa",
  "Ibarra",
  "Valdez",
  "Quintero",
  "Leyva",
];
const LADAS = ["667", "669", "686", "612", "624", "644", "653"];

const MOTIVOS_PERDIDA = [
  "eligió un local en otra plaza",
  "no alcanzó el presupuesto de renta",
  "pospuso su apertura",
];

const comoCorreo = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** RFC ficticio de persona moral: 3 letras del nombre, fecha y homoclave. */
function rfcFicticio(nombre: string, rng: Prng): string {
  const letras = comoCorreo(nombre).replace(/[0-9]/g, "").toUpperCase().padEnd(3, "X");
  const alfanumerico = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  const homoclave = Array.from({ length: 3 }, () => rng.elegir([...alfanumerico])).join(
    "",
  );
  const fecha = `${String(rng.entero(8, 22)).padStart(2, "0")}${String(rng.entero(1, 12)).padStart(2, "0")}${String(rng.entero(1, 28)).padStart(2, "0")}`;
  return `${letras.slice(0, 3)}${fecha}${homoclave}`;
}

function contactoDe(nombre: string, rng: Prng): Prospecto["contacto"] {
  const persona = `${rng.elegir(NOMBRES)} ${rng.elegir(APELLIDOS)}`;
  const numero = `${rng.entero(100, 999)} ${rng.entero(1000, 9999)}`;
  return {
    nombre: persona,
    telefono: `${rng.elegir(LADAS)} ${numero}`,
    correo: `${comoCorreo(persona.split(" ")[0])}@${comoCorreo(nombre).slice(0, 14)}.mx`,
  };
}

interface DatosActividad {
  etapa: EtapaProspecto;
  origen: OrigenProspecto;
  creadoEl: string;
  codigosLocales: string[];
  cotizacion?: Cotizacion;
  rng: Prng;
}

/** Seguimiento coherente con la etapa: cada hito conserva su orden en el tiempo. */
function actividadDe(datos: DatosActividad): ActividadProspecto[] {
  const { etapa, origen, creadoEl, codigosLocales, cotizacion, rng } = datos;
  const local = codigosLocales[0] ?? "";
  const cierre = etapa === "GANADO" || etapa === "PERDIDO";
  const alcanzo = (minima: EtapaProspecto) =>
    etapa !== "PERDIDO" &&
    (cierre || ETAPAS_PROSPECTO.indexOf(etapa) >= ETAPAS_PROSPECTO.indexOf(minima));
  const actividad: ActividadProspecto[] = [
    {
      id: "alta",
      titulo: `Alta del prospecto (${TEXTO_ORIGEN[origen]})`,
      fecha: creadoEl,
    },
  ];
  let fecha = creadoEl;
  const avanzar = (dias: number) => {
    const siguiente = sumarDias(fecha, dias);
    fecha = siguiente > DEMO_TODAY ? DEMO_TODAY : siguiente;
    return fecha;
  };
  if (alcanzo("CONTACTADO")) {
    actividad.push({
      id: "contacto",
      titulo: "Primer contacto telefónico",
      fecha: avanzar(rng.entero(1, 3)),
    });
  }
  if (alcanzo("VISITA")) {
    actividad.push({
      id: "visita",
      titulo: `Visita al local ${local}`,
      fecha: avanzar(rng.entero(2, 6)),
    });
  }
  if (cotizacion) {
    actividad.push({
      id: "cotizacion",
      titulo: `Cotización ${cotizacion.id} enviada`,
      fecha: cotizacion.emitidaEl,
    });
  } else if (etapa === "GANADO") {
    actividad.push({
      id: "cierre",
      titulo: "Contrato firmado",
      fecha: avanzar(rng.entero(3, 9)),
    });
  } else if (etapa === "PERDIDO") {
    actividad.push({
      id: "cierre",
      titulo: `Descartado: ${rng.elegir(MOTIVOS_PERDIDA)}`,
      fecha: avanzar(rng.entero(2, 10)),
    });
  }
  return actividad;
}

/** Mínimo de prospectos fríos y de tibios que la demo muestra por vendedor. */
const MINIMO_POR_TEMPERATURA = 3;

/**
 * Enfría (sin tocar el orden del seguimiento) a prospectos al día de cada
 * vendedor hasta que tenga al menos 3 fríos y 3 tibios. Solo mueve a los
 * activos sin cotización: los cotizados conservan la fecha de su oferta.
 */
function enfriarProspectos(prospectos: Prospecto[]): Prospecto[] {
  const resultado = [...prospectos];
  const vendedores = [...new Set(prospectos.map((p) => p.vendedorId))];
  for (const vendedorId of vendedores) {
    const propios = resultado.filter((p) => p.vendedorId === vendedorId);
    const temperatura = (p: Prospecto) =>
      temperaturaProspecto(diasSinContacto(p, DEMO_TODAY));
    const contar = (t: string) => propios.filter((p) => temperatura(p) === t).length;
    const candidatos = propios.filter(
      (p) => prospectoActivo(p) && p.etapa !== "COTIZADO" && temperatura(p) === "AL_DIA",
    );
    const pendientes = [
      ...Array.from(
        { length: Math.max(0, MINIMO_POR_TEMPERATURA - contar("FRIO")) },
        (_, i) => 33 + i * 4,
      ),
      ...Array.from(
        { length: Math.max(0, MINIMO_POR_TEMPERATURA - contar("TIBIO")) },
        (_, i) => 17 + i * 3,
      ),
    ];
    pendientes.forEach((dias, i) => {
      const candidato = candidatos[i];
      if (!candidato) return;
      const desplazo = dias - (diasSinContacto(candidato, DEMO_TODAY) ?? 0);
      const idx = resultado.indexOf(candidato);
      resultado[idx] = {
        ...candidato,
        creadoEl: sumarDias(candidato.creadoEl, -desplazo),
        actividad: candidato.actividad.map((a) => ({
          ...a,
          fecha: sumarDias(a.fecha, -desplazo),
        })),
      };
    });
  }
  return resultado;
}

export interface Prospeccion {
  prospectos: Prospecto[];
  /** Cotizaciones del seed con su `prospectoId` asignado. */
  cotizaciones: Cotizacion[];
}

/**
 * Prospectos de la demo, coherentes con el resto del seed:
 * - cada cotización tiene su prospecto (etapa COTIZADO) y queda enlazada;
 * - A-09 tiene exactamente 2 prospectos activos: Café Tierra Alta (COT-2026-0418) y otro;
 * - los ganados son locatarios que firmaron contrato recientemente;
 * - el interés abierto cae en locales disponibles o de plazas en preventa.
 */
export function crearProspectos(
  cotizaciones: readonly Cotizacion[],
  locales: readonly Local[],
  locatarios: readonly Locatario[],
  contratos: readonly Contrato[],
): Prospeccion {
  const rng = crearPrng(SEMILLA_PROSPECTOS);
  const porId = new Map(locales.map((l) => [l.id, l]));
  const locatarioPorId = new Map(locatarios.map((l) => [l.id, l]));
  const idHeroe = `${PLAZA_HEROE_ID}-${LOCAL_HEROE}`;
  const usados = new Set([
    ...locatarios.map((l) => l.nombre),
    ...cotizaciones.map((c) => c.prospecto.nombre),
  ]);
  const prospectos: Prospecto[] = [];
  const alta = (
    base: Pick<
      Prospecto,
      "nombre" | "documentosCompletos" | "aval" | "etapa" | "localIds" | "giro"
    >,
    cotizacion?: Cotizacion,
  ): Prospecto => {
    const origen = rng.elegir(ORIGENES);
    const creadoEl = cotizacion
      ? sumarDias(cotizacion.emitidaEl, -rng.entero(12, 30))
      : sumarDias(DEMO_TODAY, -rng.entero(2, 75));
    const prospecto: Prospecto = {
      ...base,
      id: `pro-${String(prospectos.length + 1).padStart(3, "0")}`,
      rfc: rfcFicticio(base.nombre, rng),
      contacto: contactoDe(base.nombre, rng),
      origen,
      creadoEl,
      vendedorId: vendedorDeProspecto(cotizacion, prospectos.length),
      actividad: actividadDe({
        etapa: base.etapa,
        origen,
        creadoEl,
        codigosLocales: base.localIds.map((id) => porId.get(id)?.codigo ?? ""),
        cotizacion,
        rng,
      }),
    };
    prospectos.push(prospecto);
    return prospecto;
  };
  const nombreNuevo = () => {
    for (;;) {
      const giro = rng.elegir(GIROS);
      const nombre = `${giro} ${rng.elegir(MARCAS)}`;
      if (!usados.has(nombre)) {
        usados.add(nombre);
        return { nombre, giro };
      }
    }
  };

  // Un prospecto por cotización, enlazado a ella.
  const cotizacionesEnlazadas = cotizaciones.map((cotizacion) => {
    const local = porId.get(cotizacion.localId);
    const prospecto = alta(
      {
        nombre: cotizacion.prospecto.nombre,
        documentosCompletos: cotizacion.prospecto.documentosCompletos,
        aval: cotizacion.prospecto.aval,
        etapa: "COTIZADO",
        giro: cotizacion.giro ?? local?.giro ?? rng.elegir(GIROS),
        localIds: [cotizacion.localId],
      },
      cotizacion,
    );
    return { ...cotizacion, prospectoId: prospecto.id };
  });

  // Segundo prospecto de A-09, en visita.
  const segundoA09 = nombreNuevo();
  alta({
    ...segundoA09,
    documentosCompletos: false,
    etapa: "VISITA",
    localIds: [idHeroe],
  });

  // Ganados: los locatarios con contrato más reciente.
  const ganados = SIN_COTIZACION.find(([etapa]) => etapa === "GANADO")![1];
  [...contratos]
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .slice(0, ganados)
    .forEach((contrato) => {
      const locatario = locatarioPorId.get(contrato.locatarioId);
      alta({
        nombre: locatario?.nombre ?? "Locatario",
        giro: locatario?.giro ?? rng.elegir(GIROS),
        documentosCompletos: true,
        aval: "Aval solidario registrado",
        etapa: "GANADO",
        localIds: [contrato.localId],
      });
    });

  // Interés abierto: disponibles (sin A-09) y locales de preventa.
  const interes = locales.filter(
    (l) => (l.estatus === "DISPONIBLE" || l.estatus === "PREVENTA") && l.id !== idHeroe,
  );
  for (const [etapa, cantidad] of SIN_COTIZACION) {
    if (etapa === "GANADO") continue;
    for (let i = 0; i < cantidad; i++) {
      const destinos = rng.barajar(interes).slice(0, rng.entero(1, 2));
      alta({
        ...nombreNuevo(),
        documentosCompletos: etapa === "VISITA" ? rng.prob(0.6) : false,
        etapa,
        localIds: destinos.map((l) => l.id),
      });
    }
  }
  return {
    prospectos: enfriarProspectos(prospectos),
    cotizaciones: cotizacionesEnlazadas,
  };
}
