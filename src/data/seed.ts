import {
  DEMO_TODAY,
  estatusCobro,
  proponerActualizacionAnual,
  sumarDias,
  type CambioPropuesto,
  type Ciudad,
  type Contrato,
  type Cotizacion,
  type DiferenciaConciliacion,
  type ExcepcionPrecio,
  type EventoSync,
  type Factura,
  type Integracion,
  type Licitacion,
  type Local,
  type Locatario,
  type Mantenimiento,
  type Planta,
  type Plaza,
  type Prospecto,
  type Proveedor,
  type Terreno,
} from "@/domain";
import { crearContexto } from "./cartera";
import { CATALOGO, CIUDAD_HEROE, NOMBRES_PLAZA, PROVEEDORES } from "./catalogo";
import { generarPlazas, repartir, type PlazaPlan } from "./generador";
import { crearHeroe, PLAZA_HEROE_ID } from "./heroe";
import { crearConectores } from "./integraciones";
import { crearMantenimientos } from "./mantenimientos";
import { crearLicitaciones } from "./licitaciones";
import { crearObra, type DatosObra } from "./obra";
import { crearPrng } from "./prng";
import { crearProspectos } from "./prospectos";
import { crearTerrenos } from "./terrenos";

export const SEMILLA_SEED = 2026;
export const AÑO_ACTUALIZACION = 2027;

/** Conjunto completo de datos ficticios de la demo. */
export interface Seed {
  ciudades: Ciudad[];
  plazas: Plaza[];
  plantas: Planta[];
  locales: Local[];
  locatarios: Locatario[];
  contratos: Contrato[];
  facturas: Factura[];
  cotizaciones: Cotizacion[];
  excepciones: ExcepcionPrecio[];
  /** Bandeja de actualización anual 2027, todos pendientes. */
  cambiosPropuestos: CambioPropuesto[];
  diferenciasEnKontrol: DiferenciaConciliacion[];
  /** Último sync con EnKontrol (ISO con hora). */
  ultimoSync: string;
  prospectos: Prospecto[];
  terrenos: Terreno[];
  /** Contratos de obra y cronograma de los proyectos con obra. */
  obra: DatosObra;
  /** Licitaciones de obra del héroe (adjudicadas y una en curso). */
  licitaciones: Licitacion[];
  proveedores: Proveedor[];
  mantenimientos: Mantenimiento[];
  integraciones: Integracion[];
  /** Log de sincronizaciones, del más antiguo al más reciente. */
  eventosSync: EventoSync[];
}

/** Cantidad de plazas a generar por ciudad (la héroe se escribe a mano). */
function planearPlazas(
  rng: ReturnType<typeof crearPrng>,
  heroe: { locales: number; ocupados: number },
): PlazaPlan[] {
  const nombres = [...NOMBRES_PLAZA];
  const planes: PlazaPlan[] = [];
  for (const ciudad of CATALOGO) {
    const esHeroe = ciudad.id === CIUDAD_HEROE;
    const cantidad = esHeroe ? ciudad.plazas - 1 : ciudad.plazas;
    const total = esHeroe ? ciudad.locales - heroe.locales : ciudad.locales;
    const minimo = Math.min(14, Math.floor(total / cantidad));
    const tamaños = repartir(total, cantidad, minimo, rng);
    const nuevos: PlazaPlan[] = tamaños.map((locales, i) => ({
      id: `plz-${ciudad.id}-${i + 1}`,
      nombre: nombres.shift() ?? `Plaza ${ciudad.nombre} ${i + 1}`,
      ciudad,
      preventa: i < ciudad.plazasPreventa,
      locales,
      ocupados: 0,
    }));

    // La ocupación objetivo aplica a todo lo que está en operación en la ciudad.
    const operativas = nuevos.filter((p) => !p.preventa);
    const baseOperativa =
      operativas.reduce((s, p) => s + p.locales, 0) + (esHeroe ? heroe.locales : 0);
    const objetivo =
      Math.round(baseOperativa * ciudad.ocupacionObjetivo) -
      (esHeroe ? heroe.ocupados : 0);
    let asignados = 0;
    operativas.forEach((plaza, i) => {
      const esUltima = i === operativas.length - 1;
      const parte = esUltima
        ? objetivo - asignados
        : Math.round(
            (plaza.locales / (baseOperativa - (esHeroe ? heroe.locales : 0))) * objetivo,
          );
      plaza.ocupados = Math.max(0, Math.min(plaza.locales, parte));
      asignados += plaza.ocupados;
    });
    planes.push(...nuevos);
  }
  return planes;
}

/** Construye el seed determinista: mismos datos en cada llamada. */
export function crearSeed(): Seed {
  const rng = crearPrng(SEMILLA_SEED);
  const ctx = crearContexto();
  const heroe = crearHeroe(ctx);
  const ocupadosHeroe = heroe.locales.filter((l) => l.estatus === "OCUPADO").length;
  const planes = planearPlazas(rng, {
    locales: heroe.locales.length,
    ocupados: ocupadosHeroe,
  });
  const generado = generarPlazas(planes, ctx, rng);

  // Plazas en el orden del catálogo, con la héroe al frente de su ciudad.
  const orden = new Map(CATALOGO.map((c, i) => [c.id, i]));
  const plazas = [...heroe.plazas, ...generado.plazas].sort(
    (a, b) => (orden.get(a.ciudadId) ?? 0) - (orden.get(b.ciudadId) ?? 0),
  );

  const cotizacionesGeneradas = generado.cotizaciones;
  const excepciones = crearExcepciones(
    cotizacionesGeneradas,
    [...heroe.locales, ...generado.locales],
    [...heroe.excepciones, ...generado.excepciones],
  );

  const locales = [...heroe.locales, ...generado.locales];
  const facturas = [...heroe.facturas, ...generado.facturas];
  const locatarios = [...heroe.locatarios, ...generado.locatarios];
  const contratos = [...heroe.contratos, ...generado.contratos];
  const prospeccion = crearProspectos(
    [...heroe.cotizaciones, ...cotizacionesGeneradas],
    locales,
    locatarios,
    contratos,
  );
  const terrenos = crearTerrenos(plazas, locales);
  const obra = crearObra(terrenos);
  const diferenciasEnKontrol = crearDiferencias(facturas);
  const ultimoSync = `${DEMO_TODAY}T15:52:00`;
  const conectores = crearConectores({
    facturas,
    diferencias: diferenciasEnKontrol,
    locales,
    terrenos,
    actividadesCronograma: obra.cronograma.length,
    ultimoSyncEnKontrol: ultimoSync,
  });

  return {
    ciudades: CATALOGO.map(({ id, nombre, estado, lat, lng }) => ({
      id,
      nombre,
      estado,
      lat,
      lng,
    })),
    plazas,
    plantas: [...heroe.plantas, ...generado.plantas],
    locales,
    locatarios,
    contratos,
    facturas,
    cotizaciones: prospeccion.cotizaciones,
    excepciones,
    cambiosPropuestos: crearCambiosPropuestos(locales, generado.ocupadosPorPlaza),
    diferenciasEnKontrol,
    ultimoSync,
    prospectos: prospeccion.prospectos,
    terrenos,
    obra,
    licitaciones: crearLicitaciones(obra.contratos),
    proveedores: PROVEEDORES.map((p) => ({
      ...p,
      especialidades: [...p.especialidades],
    })),
    mantenimientos: crearMantenimientos(plazas, locales),
    integraciones: conectores.integraciones,
    eventosSync: conectores.eventosSync,
  };
}

/**
 * Dos cotizaciones por debajo del mínimo para demostrar los dos pasos: una
 * PENDIENTE (espera a Dirección) y otra AUTORIZADA_DIRECCION (espera a la PMO).
 * Las excepciones históricas APLICADAS de los contratos van después.
 */
function crearExcepciones(
  cotizaciones: Cotizacion[],
  locales: Local[],
  historicas: ExcepcionPrecio[],
): ExcepcionPrecio[] {
  const porId = new Map(locales.map((l) => [l.id, l]));
  const casos: Pick<
    ExcepcionPrecio,
    "estado" | "motivo" | "autorizadaPor" | "autorizadaEn" | "comentarioDireccion"
  >[] = [
    {
      estado: "PENDIENTE",
      motivo:
        "El locatario es ancla de la plaza y cerró con otra plaza de la competencia; pedimos 3% bajo el mínimo a cambio de un contrato a 5 años.",
    },
    {
      estado: "AUTORIZADA_DIRECCION",
      motivo:
        "Giro nuevo para el mix comercial de la plaza; el cliente firma con aval y un año de renta en depósito.",
      autorizadaPor: "Mariana López",
      autorizadaEn: DEMO_TODAY,
      comentarioDireccion:
        "Autorizada: el plazo largo compensa la diferencia contra el mínimo.",
    },
  ];
  const demo = casos.map((caso, i) => {
    const cotizacion = cotizaciones[i];
    const local = porId.get(cotizacion.localId)!;
    cotizacion.rentaMensual = Math.round((local.precioMinimo * 0.97) / 10) * 10;
    return {
      id: `EXC-2026-${String(i + 1).padStart(3, "0")}`,
      cotizacionId: cotizacion.id,
      localId: local.id,
      rentaSolicitada: cotizacion.rentaMensual,
      precioMinimo: local.precioMinimo,
      solicitadaPor: "Jorge Ramírez",
      solicitadaEn: sumarDias(DEMO_TODAY, -(2 - i)),
      ...caso,
    };
  });
  return [...demo, ...historicas];
}

/**
 * Los 8 cambios de la bandeja 2027: dos de la plaza héroe, dos de otras
 * plazas de Culiacán y cuatro de Mazatlán, calculados con la regla de cada local.
 */
function crearCambiosPropuestos(
  locales: Local[],
  ocupadosPorPlaza: Map<string, Local[]>,
): CambioPropuesto[] {
  const heroe = ["B-02", "C-07"].map((codigo) =>
    locales.find((l) => l.id === `${PLAZA_HEROE_ID}-${codigo}`)!,
  );
  const primerOcupado = (prefijo: string, cantidad: number) =>
    [...ocupadosPorPlaza.entries()]
      .filter(([id]) => id.startsWith(prefijo))
      .map(([, ocupados]) => ocupados[0])
      .filter((l): l is Local => l !== undefined)
      .slice(0, cantidad);
  return [
    ...heroe,
    ...primerOcupado("plz-culiacan-", 2),
    ...primerOcupado("plz-mazatlan-", 4),
  ].map((local) => proponerActualizacionAnual(local, AÑO_ACTUALIZACION));
}

/** Tres diferencias de conciliación por $8,420 sobre pagos ya aplicados. */
function crearDiferencias(facturas: Factura[]): DiferenciaConciliacion[] {
  const pagadas = facturas.filter((f) => estatusCobro(f, DEMO_TODAY) === "PAGADA");
  const casos = [
    { concepto: "Pago SPEI sin póliza contable", monto: 3_100 },
    { concepto: "Pago parcial contra factura completa", monto: 2_850 },
    { concepto: "Depósito duplicado por conciliar", monto: 2_470 },
  ];
  return casos.map((caso, i) => ({
    id: `DIF-${i + 1}`,
    facturaId: pagadas[i * 7].id,
    ...caso,
  }));
}
