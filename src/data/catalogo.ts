import type { Ciudad, Proveedor } from "@/domain";

/** Ciudad del catálogo con los conteos que fija la guía visual. */
export interface EntradaCatalogo extends Ciudad {
  plazas: number;
  locales: number;
  /** Plazas de la ciudad que están en preventa. */
  plazasPreventa: number;
  /** Ocupación objetivo de las plazas en operación (0-1). */
  ocupacionObjetivo: number;
}

/** 11 ciudades, 39 plazas, 946 locales. */
export const CATALOGO: readonly EntradaCatalogo[] = [
  {
    id: "matamoros",
    nombre: "Matamoros",
    estado: "Sonora",
    lat: 30.7,
    lng: -112.1,
    plazas: 1,
    locales: 14,
    plazasPreventa: 0,
    ocupacionObjetivo: 1,
  },
  {
    id: "rosarito",
    nombre: "Rosarito",
    estado: "Baja California",
    lat: 32.3333,
    lng: -117.0333,
    plazas: 1,
    locales: 21,
    plazasPreventa: 0,
    ocupacionObjetivo: 0.95,
  },
  {
    id: "mexicali",
    nombre: "Mexicali",
    estado: "Baja California",
    lat: 32.6245,
    lng: -115.4523,
    plazas: 6,
    locales: 149,
    plazasPreventa: 2,
    ocupacionObjetivo: 0.46,
  },
  {
    id: "ensenada",
    nombre: "Ensenada",
    estado: "Baja California",
    lat: 31.8667,
    lng: -116.6,
    plazas: 1,
    locales: 26,
    plazasPreventa: 0,
    ocupacionObjetivo: 0.65,
  },
  {
    id: "obregon",
    nombre: "Ciudad Obregón",
    estado: "Sonora",
    lat: 27.4828,
    lng: -109.9304,
    plazas: 1,
    locales: 25,
    plazasPreventa: 0,
    ocupacionObjetivo: 1,
  },
  {
    id: "guasave",
    nombre: "Guasave",
    estado: "Sinaloa",
    lat: 25.5667,
    lng: -108.4667,
    plazas: 1,
    locales: 30,
    plazasPreventa: 0,
    ocupacionObjetivo: 1,
  },
  {
    id: "culiacan",
    nombre: "Culiacán",
    estado: "Sinaloa",
    lat: 24.8091,
    lng: -107.394,
    plazas: 6,
    locales: 148,
    plazasPreventa: 0,
    ocupacionObjetivo: 0.81,
  },
  {
    id: "mazatlan",
    nombre: "Mazatlán",
    estado: "Sinaloa",
    lat: 23.2494,
    lng: -106.4111,
    plazas: 7,
    locales: 166,
    plazasPreventa: 0,
    ocupacionObjetivo: 0.79,
  },
  {
    id: "la-paz",
    nombre: "La Paz",
    estado: "Baja California Sur",
    lat: 24.1426,
    lng: -110.3128,
    plazas: 3,
    locales: 85,
    plazasPreventa: 1,
    ocupacionObjetivo: 0.95,
  },
  {
    id: "cabo-san-lucas",
    nombre: "Cabo San Lucas",
    estado: "Baja California Sur",
    lat: 22.8905,
    lng: -109.9167,
    plazas: 6,
    locales: 149,
    plazasPreventa: 3,
    ocupacionObjetivo: 0.93,
  },
  {
    id: "san-jose-del-cabo",
    nombre: "San José del Cabo",
    estado: "Baja California Sur",
    lat: 23.0614,
    lng: -109.6975,
    plazas: 6,
    locales: 133,
    plazasPreventa: 2,
    ocupacionObjetivo: 0.72,
  },
];

export const CIUDAD_HEROE = "culiacan";

/** Nombres ficticios de las 38 plazas generadas (la plaza héroe se nombra aparte). */
export const NOMBRES_PLAZA: readonly string[] = [
  "Plaza Aurora",
  "Plaza Bahía Norte",
  "Plaza Cantera",
  "Plaza Dunas",
  "Plaza Estero",
  "Plaza Faro",
  "Plaza Girasol",
  "Plaza Horizonte",
  "Plaza Isla Verde",
  "Plaza Jacaranda",
  "Plaza Kiosco",
  "Plaza Laguna",
  "Plaza Mirador",
  "Plaza Naranjos",
  "Plaza Olivar",
  "Plaza Palmar",
  "Plaza Quinta Real",
  "Plaza Ribera",
  "Plaza Sauces",
  "Plaza Terraza",
  "Plaza Umbral",
  "Plaza Valle Sol",
  "Plaza Vistamar",
  "Plaza Yucatán Norte",
  "Plaza Zafiro",
  "Plaza Arrecife",
  "Plaza Brisas",
  "Plaza Cumbres",
  "Plaza Delfín",
  "Plaza Esmeralda Sur",
  "Plaza Fresnos",
  "Plaza Granada",
  "Plaza Higuera",
  "Plaza Ixtapa Norte",
  "Plaza Jardines",
  "Plaza Lomas Altas",
  "Plaza Marina Sol",
  "Plaza Nogal",
];

export const GIROS: readonly string[] = [
  "Cafetería",
  "Restaurante",
  "Farmacia",
  "Papelería",
  "Estética",
  "Barbería",
  "Óptica",
  "Dentista",
  "Lavandería",
  "Gimnasio",
  "Telefonía",
  "Boutique",
  "Panadería",
  "Veterinaria",
  "Banco",
  "Nutrición",
  "Yoga",
  "Joyería",
  "Zapatería",
  "Tintorería",
];

export const MARCAS: readonly string[] = [
  "Raíz",
  "Tierra Viva",
  "Oasis",
  "Brújula",
  "Marea",
  "Lumbre",
  "Colibrí",
  "Cardón",
  "Mezquite",
  "Pitaya",
  "Coral",
  "Nopal",
  "Caracol",
  "Solana",
  "Tulipán",
  "Arrayán",
  "Cobalto",
  "Alba",
  "Magnolia",
  "Ágave",
  "Pergola",
  "Manglar",
  "Sirena",
  "Duna",
];

type DatosProveedor = Pick<Proveedor, "id" | "nombre" | "rfc" | "contacto">;

function proveedorMantenimiento(
  p: DatosProveedor & Pick<Proveedor, "especialidadesMantenimiento">,
): Proveedor {
  return { ...p, partidasObra: [], plazaIds: [], activo: true };
}

function proveedorObra(p: DatosProveedor & Pick<Proveedor, "partidasObra">): Proveedor {
  return { ...p, especialidadesMantenimiento: [], plazaIds: [], activo: true };
}

/**
 * Padrón ficticio: primero los 8 de mantenimiento (`prv-N`, en el orden que sortea
 * la semilla de mantenimientos) y después los 18 contratistas de obra (`prv-obra-NN`).
 * `plazaIds` va vacío porque los ids de plaza nacen en `crearSeed`, que asigna todas
 * las plazas a los de mantenimiento.
 */
export const PROVEEDORES: readonly Proveedor[] = [
  proveedorMantenimiento({
    id: "prv-1",
    nombre: "Mantenimientos Comerciales S.A. de C.V.",
    rfc: "MCO180412K35",
    contacto: {
      nombre: "Rodrigo Salazar",
      correo: "rsalazar@mantcomerciales.mx",
      whatsapp: "667 214 8830",
    },
    especialidadesMantenimiento: ["PINTURA", "IMPERMEABILIZACION", "LIMPIEZA"],
  }),
  proveedorMantenimiento({
    id: "prv-2",
    nombre: "Electro Servicios del Pacífico",
    rfc: "ESP150720QA7",
    contacto: {
      nombre: "Laura Medina",
      correo: "lmedina@electropacifico.mx",
      whatsapp: "669 318 4402",
    },
    especialidadesMantenimiento: ["ELECTRICO"],
  }),
  proveedorMantenimiento({
    id: "prv-3",
    nombre: "Climas y Refrigeración del Norte",
    rfc: "CRN120306H92",
    contacto: {
      nombre: "Héctor Ibarra",
      correo: "hibarra@climasnorte.mx",
      whatsapp: "686 527 1194",
    },
    especialidadesMantenimiento: ["CLIMA", "ELECTRICO"],
  }),
  proveedorMantenimiento({
    id: "prv-4",
    nombre: "Plomería Integral Sinaloa",
    rfc: "PIS170918D41",
    contacto: {
      nombre: "Mónica Quintero",
      correo: "mquintero@plomeriasinaloa.mx",
      whatsapp: "667 403 2276",
    },
    especialidadesMantenimiento: ["PLOMERIA"],
  }),
  proveedorMantenimiento({
    id: "prv-5",
    nombre: "Impermeabilizantes Costa Azul",
    rfc: "ICA140225L68",
    contacto: {
      nombre: "Jorge Valenzuela",
      correo: "jvalenzuela@costaazul.mx",
      whatsapp: "612 145 6038",
    },
    especialidadesMantenimiento: ["IMPERMEABILIZACION"],
  }),
  proveedorMantenimiento({
    id: "prv-6",
    nombre: "Limpieza Profesional Aseo Total",
    rfc: "LPA130611T53",
    contacto: {
      nombre: "Patricia Ochoa",
      correo: "pochoa@aseototal.mx",
      whatsapp: "624 236 7751",
    },
    especialidadesMantenimiento: ["LIMPIEZA"],
  }),
  proveedorMantenimiento({
    id: "prv-7",
    nombre: "Pinturas y Acabados Delgado",
    rfc: "PAD160809B27",
    contacto: {
      nombre: "Arturo Delgado",
      correo: "adelgado@pinturasdelgado.mx",
      whatsapp: "644 512 9087",
    },
    especialidadesMantenimiento: ["PINTURA"],
  }),
  proveedorMantenimiento({
    id: "prv-8",
    nombre: "Servicios Técnicos Integrales Bajío",
    rfc: "STI190130M84",
    contacto: {
      nombre: "Verónica Ríos",
      correo: "vrios@stibajio.mx",
      whatsapp: "653 381 4429",
    },
    especialidadesMantenimiento: ["PLOMERIA", "ELECTRICO", "CLIMA"],
  }),
  proveedorObra({
    id: "prv-obra-01",
    nombre: "Terracerías del Pacífico",
    rfc: "TPA110415R27",
    contacto: {
      nombre: "Ernesto Félix",
      correo: "efelix@terraceriaspacifico.mx",
      whatsapp: "667 702 3318",
    },
    partidasObra: ["TERRACERIAS", "CIMENTACION"],
  }),
  proveedorObra({
    id: "prv-obra-02",
    nombre: "Constructora Delta",
    rfc: "CDE090822J61",
    contacto: {
      nombre: "Sofía Arredondo",
      correo: "sarredondo@constructoradelta.mx",
      whatsapp: "669 241 5506",
    },
    partidasObra: ["CIMENTACION", "ESTRUCTURA"],
  }),
  proveedorObra({
    id: "prv-obra-03",
    nombre: "Grupo Constructor Mayab",
    rfc: "GCM130517P48",
    contacto: {
      nombre: "Manuel Canché",
      correo: "mcanche@grupomayab.mx",
      whatsapp: "686 334 7721",
    },
    partidasObra: ["MUROS", "ESTRUCTURA"],
  }),
  proveedorObra({
    id: "prv-obra-04",
    nombre: "Instalaciones Hidrosinaloa",
    rfc: "IHI100903S15",
    contacto: {
      nombre: "Adriana López",
      correo: "alopez@hidrosinaloa.mx",
      whatsapp: "667 158 2940",
    },
    partidasObra: ["INST_HIDRAULICAS"],
  }),
  proveedorObra({
    id: "prv-obra-05",
    nombre: "Electrificaciones del Noroeste",
    rfc: "ENO120228K73",
    contacto: {
      nombre: "Ricardo Gaxiola",
      correo: "rgaxiola@electrinoroeste.mx",
      whatsapp: "644 427 6613",
    },
    partidasObra: ["INST_ELECTRICAS"],
  }),
  proveedorObra({
    id: "prv-obra-06",
    nombre: "Cubiertas y Losas del Norte",
    rfc: "CLN140711G39",
    contacto: {
      nombre: "Gabriela Soto",
      correo: "gsoto@cubiertasnorte.mx",
      whatsapp: "686 590 1832",
    },
    partidasObra: ["TECHOS", "ESTRUCTURA"],
  }),
  proveedorObra({
    id: "prv-obra-07",
    nombre: "Acabados y Pisos del Bajío",
    rfc: "APB160304W82",
    contacto: {
      nombre: "Fernando Ruelas",
      correo: "fruelas@acabadosbajio.mx",
      whatsapp: "653 276 4405",
    },
    partidasObra: ["ACABADOS"],
  }),
  proveedorObra({
    id: "prv-obra-08",
    nombre: "Movimientos de Tierra del Golfo",
    rfc: "MTG081119N56",
    contacto: {
      nombre: "Claudia Herrera",
      correo: "cherrera@tierragolfo.mx",
      whatsapp: "612 383 9170",
    },
    partidasObra: ["TERRACERIAS"],
  }),
  proveedorObra({
    id: "prv-obra-09",
    nombre: "Obras y Estructuras Marinas",
    rfc: "OEM110630H24",
    contacto: {
      nombre: "Alberto Montaño",
      correo: "amontano@obrasmarinas.mx",
      whatsapp: "624 115 3368",
    },
    partidasObra: ["MUROS", "CIMENTACION"],
  }),
  proveedorObra({
    id: "prv-obra-10",
    nombre: "Constructora Tamaulipeca",
    rfc: "CTA150214V91",
    contacto: {
      nombre: "Diana Garza",
      correo: "dgarza@tamaulipeca.mx",
      whatsapp: "669 452 8014",
    },
    partidasObra: ["TERRACERIAS", "MUROS"],
  }),
  proveedorObra({
    id: "prv-obra-11",
    nombre: "Ingeniería Eléctrica Integral",
    rfc: "IEI170506C38",
    contacto: {
      nombre: "Óscar Bojórquez",
      correo: "obojorquez@ieintegral.mx",
      whatsapp: "667 619 2257",
    },
    partidasObra: ["INST_ELECTRICAS"],
  }),
  proveedorObra({
    id: "prv-obra-12",
    nombre: "Hidráulica y Riego del Norte",
    rfc: "HRN130925F67",
    contacto: {
      nombre: "Lucía Camacho",
      correo: "lcamacho@riegonorte.mx",
      whatsapp: "644 738 5049",
    },
    partidasObra: ["INST_HIDRAULICAS"],
  }),
  proveedorObra({
    id: "prv-obra-13",
    nombre: "Impermeabilizantes y Cubiertas Regio",
    rfc: "ICR180117X45",
    contacto: {
      nombre: "Raúl Treviño",
      correo: "rtrevino@cubiertasregio.mx",
      whatsapp: "686 204 6681",
    },
    partidasObra: ["TECHOS"],
  }),
  proveedorObra({
    id: "prv-obra-14",
    nombre: "Pisos y Acabados Premier",
    rfc: "PAP160822Z13",
    contacto: {
      nombre: "Mariana Acosta",
      correo: "macosta@pisospremier.mx",
      whatsapp: "612 566 7732",
    },
    partidasObra: ["ACABADOS"],
  }),
  proveedorObra({
    id: "prv-obra-15",
    nombre: "Concretos y Obras del Pacífico",
    rfc: "COP120419E76",
    contacto: {
      nombre: "Javier Peraza",
      correo: "jperaza@concretospacifico.mx",
      whatsapp: "669 873 1025",
    },
    partidasObra: ["CIMENTACION", "ESTRUCTURA", "MUROS"],
  }),
  proveedorObra({
    id: "prv-obra-16",
    nombre: "Edificaciones Lomas",
    rfc: "ELO190308U52",
    contacto: {
      nombre: "Teresa Lomelí",
      correo: "tlomeli@edificacioneslomas.mx",
      whatsapp: "624 347 9958",
    },
    partidasObra: ["MUROS", "ACABADOS", "TECHOS"],
  }),
  proveedorObra({
    id: "prv-obra-17",
    nombre: "Grupo Edificador Sonora",
    rfc: "GES140127Y84",
    contacto: {
      nombre: "Guillermo Urías",
      correo: "gurias@edificadorsonora.mx",
      whatsapp: "644 291 4476",
    },
    partidasObra: ["MUROS", "ESTRUCTURA", "ACABADOS"],
  }),
  proveedorObra({
    id: "prv-obra-18",
    nombre: "Servicios de Obra Civil Nova",
    rfc: "SOC171010L29",
    contacto: {
      nombre: "Andrea Villegas",
      correo: "avillegas@obracivilnova.mx",
      whatsapp: "653 468 2213",
    },
    partidasObra: ["TERRACERIAS", "TECHOS", "MUROS"],
  }),
];

/** Proveedor del padrón por su nombre (los nombres son únicos); liga contratos de obra y licitaciones de la semilla. */
export const PROVEEDOR_POR_NOMBRE: ReadonlyMap<string, Proveedor> = new Map(
  PROVEEDORES.map((p) => [p.nombre, p]),
);
