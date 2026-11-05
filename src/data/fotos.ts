import {
  fotosDeLocal as seleccionarFotos,
  hashCadena,
  type CategoriaFotoLocal,
  type CategoriaMantenimiento,
  type Foto,
  type Local,
} from "@/domain";

/** Foto del catálogo más su procedencia (todas de Wikimedia Commons, licencias libres). */
export type FotoCatalogo = Foto & { fuente: string };

const COMMONS = "https://commons.wikimedia.org/wiki/";

/** Claves del catálogo: giros de locales y categorías de evidencia de mantenimiento. */
export type CategoriaCatalogo = CategoriaFotoLocal | CategoriaMantenimiento;

export const CATALOGO_FOTOS: Record<CategoriaCatalogo, FotoCatalogo[]> = {
  vacio: [
    {
      src: "/locales/vacio/01.webp",
      alt: "Local comercial vacío en obra gris",
      ancho: 1200,
      alto: 800,
      fuente: `autor en Commons · CC BY 2.0 · ${COMMONS}Empty_Retail_Space.jpg`,
    },
    {
      src: "/locales/vacio/02.webp",
      alt: "Espacio comercial vacío con vitrina",
      ancho: 1200,
      alto: 800,
      fuente: `autor en Commons · CC BY 2.0 · ${COMMONS}Empty_Retail_Space_-_2322544254.jpg`,
    },
    {
      src: "/locales/vacio/03.webp",
      alt: "Local desocupado listo para remodelar",
      ancho: 1200,
      alto: 800,
      fuente: `autor en Commons · CC BY 2.0 · ${COMMONS}Empty_Retail_Space_-_2322548168.jpg`,
    },
    {
      src: "/locales/vacio/04.webp",
      alt: "Local vacío con piso y muros a la vista",
      ancho: 1200,
      alto: 800,
      fuente: `Mutney · CC BY-SA 4.0 · ${COMMONS}Empty_Wilko's_shop,_Fore_Street_Redruth,_Cornwall_-_September_2023.jpg`,
    },
  ],
  alimentos: [
    {
      src: "/locales/alimentos/01.webp",
      alt: "Cafetería con mesas y barra",
      ancho: 1200,
      alto: 800,
      fuente: `Bob Harvey · CC BY-SA 2.0 · ${COMMONS}Cafe_Interior_-_geograph.org.uk_-_4801988.jpg`,
    },
    {
      src: "/locales/alimentos/02.webp",
      alt: "Salón de cafetería con ventanal",
      ancho: 1200,
      alto: 800,
      fuente: `Bob Harvey · CC BY-SA 2.0 · ${COMMONS}Cafe_interior_-_geograph.org.uk_-_4801991.jpg`,
    },
    {
      src: "/locales/alimentos/03.webp",
      alt: "Cafetería con mobiliario de madera",
      ancho: 1200,
      alto: 800,
      fuente: `Bob Harvey · CC BY-SA 2.0 · ${COMMONS}Interior_of_cafe_-_geograph.org.uk_-_4077059.jpg`,
    },
    {
      src: "/locales/alimentos/04.webp",
      alt: "Restaurante con mesas puestas",
      ancho: 1200,
      alto: 800,
      fuente: `Gerda Arendt · CC0 · ${COMMONS}Restaurant_interior,_Paris.jpg`,
    },
  ],
  moda: [
    {
      src: "/locales/moda/01.webp",
      alt: "Joyería con vitrinas iluminadas",
      ancho: 1200,
      alto: 800,
      fuente: `W.carter · CC BY-SA 4.0 · ${COMMONS}Interior_of_Sophies_Silver_jewelry_store_at_Sankt_Hansgatan_34,_Visby,_Sweden_1.jpg`,
    },
    {
      src: "/locales/moda/02.webp",
      alt: "Tienda de perlas con mostradores",
      ancho: 1200,
      alto: 800,
      fuente: `Steffen Mokosch · CC BY-SA 4.0 · ${COMMONS}Orquidea_Pearls_shop_interior_Manacor_1.jpg`,
    },
    {
      src: "/locales/moda/03.webp",
      alt: "Escaparate interior de joyería",
      ancho: 1200,
      alto: 800,
      fuente: `Steffen Mokosch · CC BY-SA 4.0 · ${COMMONS}Orquidea_Pearls_shop_interior_Manacor_2.jpg`,
    },
    {
      src: "/locales/moda/04.webp",
      alt: "Zapatería con anaqueles de calzado",
      ancho: 1200,
      alto: 800,
      fuente: `Rakoon · CC0 · ${COMMONS}20190914_132403_Shoe_store_in_Piotrkowska_street,_Lodz.jpg`,
    },
  ],
  salud: [
    {
      src: "/locales/salud/01.webp",
      alt: "Farmacia con mostrador y anaqueles",
      ancho: 1200,
      alto: 800,
      fuente: `Mike1979 Russia · CC BY-SA 3.0 · ${COMMONS}Brest_Greenberg_Pharmacy_Interior_2024-09-20_3798.jpg`,
    },
    {
      src: "/locales/salud/02.webp",
      alt: "Interior de farmacia",
      ancho: 1200,
      alto: 800,
      fuente: `Infrogmation of New Orleans · CC BY-SA 2.0 · ${COMMONS}Castellon_Pharmacy,_New_Orleans,_interior,_19_Sept_2024_-_1.jpg`,
    },
    {
      src: "/locales/salud/03.webp",
      alt: "Botica con mobiliario clásico",
      ancho: 1200,
      alto: 800,
      fuente: `Ridiculopathy · CC0 · ${COMMONS}The_interior_of_Sweny's_pharmacy,_Lincoln_Place,_Dublin,_Ireland_06.jpg`,
    },
    {
      src: "/locales/salud/04.webp",
      alt: "Consultorio dental equipado",
      ancho: 1200,
      alto: 800,
      fuente: `Rakoon · CC0 · ${COMMONS}20180101-123256-dental-clinic-ramat-gan-israel-2018.jpg`,
    },
  ],
  bienestar: [
    {
      src: "/locales/bienestar/01.webp",
      alt: "Gimnasio con equipo de pesas",
      ancho: 1200,
      alto: 800,
      fuente: `Larry D. Moore · CC BY 4.0 · ${COMMONS}Adams_Gym_Interior_Lockhart_Texas_2018.jpg`,
    },
    {
      src: "/locales/bienestar/02.webp",
      alt: "Gimnasio amplio con máquinas",
      ancho: 1200,
      alto: 800,
      fuente: `Matti Blume · CC BY-SA 4.0 · ${COMMONS}Gym,_GLV1,_Nairobi_(20250810-LRM_20250810_050004).jpg`,
    },
    {
      src: "/locales/bienestar/03.webp",
      alt: "Barbería con sillones",
      ancho: 1200,
      alto: 800,
      fuente: `Jim Pennucci from Hope, USA · CC BY 2.0 · ${COMMONS}Barber_Shop_(Explored)_-_Flickr_-_pennuja.jpg`,
    },
    {
      src: "/locales/bienestar/04.webp",
      alt: "Barbería con espejos y estaciones",
      ancho: 1200,
      alto: 800,
      fuente: `PaulGorduiz106 · CC BY-SA 4.0 · ${COMMONS}Interior_of_a_barber_shop_in_Mandaue_City_(04-23-2023).jpg`,
    },
  ],
  servicios: [
    {
      src: "/locales/servicios/01.webp",
      alt: "Papelería con exhibidores",
      ancho: 1200,
      alto: 800,
      fuente: `Kolforn (Kolforn) · CC BY-SA 4.0 · ${COMMONS}-2020-10-23_Inside_'The_Works'_books_and_stationery_shop,_Church_Street,_Sheringham.JPG`,
    },
    {
      src: "/locales/servicios/02.webp",
      alt: "Lavandería con lavadoras en fila",
      ancho: 1200,
      alto: 800,
      fuente: `Daderot · CC0 · ${COMMONS}Laundromat_-_Arlington,_MA.jpg`,
    },
    {
      src: "/locales/servicios/03.webp",
      alt: "Lavandería de autoservicio",
      ancho: 1200,
      alto: 800,
      fuente: `E961 · CC BY 4.0 · ${COMMONS}Interior_view_of_laundromat.jpg`,
    },
    {
      src: "/locales/servicios/04.webp",
      alt: "Sucursal bancaria con módulos de atención",
      ancho: 1200,
      alto: 800,
      fuente: `Suiren2022 · CC BY-SA 4.0 · ${COMMONS}Bank_of_America_branch_interior_in_Palo_Alto_CA.jpg`,
    },
  ],
  PINTURA: [
    {
      src: "/mantenimientos/pintura/01.webp",
      alt: "Técnico aplicando pintura a un muro con rodillo",
      ancho: 1200,
      alto: 800,
      fuente: `U.S. Navy (MC3) · dominio público · ${COMMONS}US_Navy_070823-N-9195K-025_Aerographer's_Mate_1st_Class_William_Palmer_uses_a_roller_to_add_a_second_coat_of_paint_to_a_wall_during_a_community_relations_project_at_Voza_Medical_Clinic_in_support_of_Pacific_Partnership.jpg`,
    },
    {
      src: "/mantenimientos/pintura/02.webp",
      alt: "Rodillo pintando un muro de ladrillo",
      ancho: 1200,
      alto: 800,
      fuente: `Michael Cory · CC BY 2.0 · ${COMMONS}Paint_roller_4.jpg`,
    },
  ],
  IMPERMEABILIZACION: [
    {
      src: "/mantenimientos/impermeabilizacion/01.webp",
      alt: "Azotea con membrana impermeabilizante en rollos",
      ancho: 1200,
      alto: 800,
      fuente: `Μάριος-Μητσόγλου · CC BY-SA 4.0 · ${COMMONS}Roof_waterproofing_system_application_by_Monotica_Athens.jpg`,
    },
    {
      src: "/mantenimientos/impermeabilizacion/02.webp",
      alt: "Azotea con impermeabilizante líquido terminado",
      ancho: 1200,
      alto: 800,
      fuente: `Μάριος-Μητσόγλου · CC BY-SA 4.0 · ${COMMONS}Roof_waterproofing_with_polyurethane_liquid_membrane_in_Egaleo_Athens.webp`,
    },
  ],
  ELECTRICO: [
    {
      src: "/mantenimientos/electrico/01.webp",
      alt: "Electricista conectando cableado con herramientas",
      ancho: 1200,
      alto: 800,
      fuente: `flickr user editor B · CC BY 2.0 · ${COMMONS}Electrician_Working.jpg`,
    },
    {
      src: "/mantenimientos/electrico/02.webp",
      alt: "Electricista trabajando en un tablero eléctrico",
      ancho: 1200,
      alto: 800,
      fuente: `MTA Capital Construction Mega Projects · CC BY 2.0 · ${COMMONS}Electrician_pulling_wires_to_an_electrical_panel_in_a_substation_room_located_in_the_back_of_house_area_of_the_concourse._(CM014B,_11-14-2018)_(44096152510).jpg`,
    },
  ],
  PLOMERIA: [
    {
      src: "/mantenimientos/plomeria/01.webp",
      alt: "Plomero instalando tubería en un muro",
      ancho: 1200,
      alto: 800,
      fuente: `Amuzujoe · CC BY-SA 4.0 · ${COMMONS}Plumber_01.jpg`,
    },
    {
      src: "/mantenimientos/plomeria/02.webp",
      alt: "Plomeros armando tuberías en un taller",
      ancho: 1200,
      alto: 800,
      fuente: `State Government Photographer · CC0 · ${COMMONS}Plumbers_Trade_School_Students_Working_on_Pipes(GN08936).jpg`,
    },
  ],
  CLIMA: [
    {
      src: "/mantenimientos/clima/01.webp",
      alt: "Técnico revisando la presión de un equipo de aire acondicionado",
      ancho: 1200,
      alto: 800,
      fuente: `U.S. Air Force AFCENT (A1C Derrick) · dominio público · ${COMMONS}379th_ECES_HVAC_technicians_combat_rising_temperatures_(8502257).jpg`,
    },
    {
      src: "/mantenimientos/clima/02.webp",
      alt: "Técnica dando servicio a una unidad exterior de clima",
      ancho: 1200,
      alto: 800,
      fuente: `U.S. Air Force (SrA Mark Colmenares) · dominio público · ${COMMONS}Cool_under_pressure-_386th_ECES_HVAC_technicians_in_action_(9047739).jpg`,
    },
  ],
  LIMPIEZA: [
    {
      src: "/mantenimientos/limpieza/01.webp",
      alt: "Personal puliendo el piso de un salón con máquina",
      ancho: 1200,
      alto: 800,
      fuente: `Commercial Cleaning Maryland · CC BY-SA 2.0 · ${COMMONS}Floor_Stripping_and_Rewaxing_in_Frederick_Md.jpg`,
    },
    {
      src: "/mantenimientos/limpieza/02.webp",
      alt: "Pasillo de oficinas recién limpiado",
      ancho: 1200,
      alto: 800,
      fuente: `Commercial Cleaning Maryland · CC BY-SA 2.0 · ${COMMONS}Floor_Cleaning_in_Elkridge_Maryland.jpg`,
    },
  ],
};

/** Tres fotos del local según su categoría, con el catálogo ya ligado. */
export function fotosDeLocal(local: Pick<Local, "id" | "estatus" | "giro">): Foto[] {
  return seleccionarFotos(local, CATALOGO_FOTOS);
}

/**
 * Hasta `n` fotos de evidencia de la categoría, rotadas por el hash de `semilla`
 * (el mismo trabajo y paso siempre ve las mismas). Omite las de `existentes`, de
 * modo que "antes" y "después" nunca repiten la misma foto.
 */
export function evidenciaSimulada(
  categoria: CategoriaMantenimiento,
  semilla: string,
  n: number,
  existentes: readonly Foto[] = [],
): Foto[] {
  const usadas = new Set(existentes.map((f) => f.src));
  const disponibles = CATALOGO_FOTOS[categoria].filter((f) => !usadas.has(f.src));
  if (disponibles.length === 0) return [];
  const offset = hashCadena(semilla) % disponibles.length;
  const total = Math.min(Math.max(0, n), disponibles.length);
  return Array.from({ length: total }, (_, i) => {
    const { src, alt, ancho, alto } = disponibles[(offset + i) % disponibles.length];
    return { src, alt, ancho, alto };
  });
}

/** Evidencia simulada al iniciar un trabajo: una foto del "antes". */
export function evidenciaAntes(
  categoria: CategoriaMantenimiento,
  semilla: string,
  existentes: readonly Foto[] = [],
): Foto[] {
  return evidenciaSimulada(categoria, `${semilla}-antes`, 1, existentes);
}

/** Evidencia simulada al finalizar: una foto del "después", distinta de las que ya hay. */
export function evidenciaDespues(
  categoria: CategoriaMantenimiento,
  semilla: string,
  existentes: readonly Foto[] = [],
): Foto[] {
  return evidenciaSimulada(categoria, `${semilla}-despues`, 1, existentes);
}
