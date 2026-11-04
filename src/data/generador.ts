import {
  DEMO_TODAY,
  INPC_ANUAL,
  pactarRegla,
  repricingAlLiberar,
  sumarDias,
  sumarMeses,
  type Contrato,
  type Cotizacion,
  type EstatusLocal,
  type Local,
  type Locatario,
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
import { GIROS, MARCAS, type EntradaCatalogo } from "./catalogo";
import { coordenadasPlaza } from "./coordenadas";
import type { ParteSeed } from "./heroe";
import { geometriaRejilla, LIENZO } from "./planos";
import type { Prng } from "./prng";

/** Plaza por generar: lo que fija el catálogo y el reparto de locales. */
export interface PlazaPlan {
  id: string;
  nombre: string;
  ciudad: EntradaCatalogo;
  preventa: boolean;
  locales: number;
  /** Locales ocupados (solo plazas en operación). */
  ocupados: number;
}

const TARIFA_M2: Record<string, [number, number]> = {
  "cabo-san-lucas": [480, 620],
  "san-jose-del-cabo": [460, 580],
  "la-paz": [380, 480],
};
const TARIFA_DEFAULT: [number, number] = [320, 440];

const PLAZOS_MESES = [36, 48, 60];

/** Reparte `total` en `partes` enteros ≥ `minimo` con pesos pseudoaleatorios. */
export function repartir(
  total: number,
  partes: number,
  minimo: number,
  rng: Prng,
): number[] {
  const pesos = Array.from({ length: partes }, () => 0.6 + rng.siguiente());
  const suma = pesos.reduce((a, b) => a + b, 0);
  const libres = total - minimo * partes;
  const reparto = pesos.map((p) => minimo + Math.floor((p / suma) * libres));
  let resto = total - reparto.reduce((a, b) => a + b, 0);
  for (let i = 0; resto > 0; i = (i + 1) % partes, resto--) reparto[i] += 1;
  return reparto;
}

function reglaDePlaza(rng: Prng): ReglaActualizacion {
  const modo = rng.prob(0.7) ? "SEMIAUTOMATICO" : "AUTOMATICO";
  const tipo = rng.elegir(["INPC", "INPC_PTS", "INPC_PTS", "VALOR_FIJO"] as const);
  if (tipo === "INPC_PTS")
    return { tipo, puntos: rng.elegir([1, 1, 1.5, 2]), cuando: "ANIVERSARIO", modo };
  if (tipo === "VALOR_FIJO")
    return { tipo, porcentajeFijo: rng.elegir([4, 5]), cuando: "ANIVERSARIO", modo };
  return { tipo, cuando: "ANIVERSARIO", modo };
}

function letraFila(i: number): string {
  return String.fromCharCode(65 + (i % 26));
}

/** Estatus de cada local: ocupados primero, luego cotización, el resto disponible. */
function asignarEstatus(plan: PlazaPlan, rng: Prng): EstatusLocal[] {
  if (plan.preventa) return Array.from({ length: plan.locales }, () => "PREVENTA");
  const libres = plan.locales - plan.ocupados;
  const enCotizacion = libres > 3 ? Math.max(1, Math.round(libres * 0.12)) : 0;
  const estatus: EstatusLocal[] = [
    ...Array.from({ length: plan.ocupados }, () => "OCUPADO" as const),
    ...Array.from({ length: enCotizacion }, () => "EN_COTIZACION" as const),
    ...Array.from({ length: libres - enCotizacion }, () => "DISPONIBLE" as const),
  ];
  return rng.barajar(estatus);
}

export interface Generado extends ParteSeed {
  /** Locales ocupados de cada plaza (insumo de la bandeja de actualización anual). */
  ocupadosPorPlaza: Map<string, Local[]>;
}

/** Genera plazas, locales, locatarios, contratos, facturas y cotizaciones. */
export function generarPlazas(planes: PlazaPlan[], ctx: Contexto, rng: Prng): Generado {
  const salida: Generado = {
    plazas: [],
    plantas: [],
    locales: [],
    locatarios: [],
    contratos: [],
    facturas: [],
    cotizaciones: [],
    ocupadosPorPlaza: new Map(),
  };
  let folioCot = 300;

  for (const plan of planes) {
    const regla = reglaDePlaza(rng);
    const plaza: Plaza = {
      id: plan.id,
      nombre: plan.nombre,
      ciudadId: plan.ciudad.id,
      estatus: plan.preventa ? "PREVENTA" : "EN_OPERACION",
      coordenadas: coordenadasPlaza(plan.ciudad, plan.id),
      reglaDefault: regla,
    };
    salida.plazas.push(plaza);

    const enPlantaAlta = plan.locales >= 30 ? Math.round(plan.locales * 0.3) : 0;
    const plantaBaja: Planta = {
      id: `${plan.id}-pb`,
      plazaId: plan.id,
      nombre: "Planta baja",
      ...LIENZO,
    };
    const plantaAlta: Planta = {
      ...plantaBaja,
      id: `${plan.id}-pa`,
      nombre: "Planta alta",
    };
    salida.plantas.push(plantaBaja);
    if (enPlantaAlta > 0) salida.plantas.push(plantaAlta);

    const estatus = asignarEstatus(plan, rng);
    const geoPB = geometriaRejilla(plan.locales - enPlantaAlta);
    const geoPA = geometriaRejilla(enPlantaAlta);
    const [tMin, tMax] = TARIFA_M2[plan.ciudad.id] ?? TARIFA_DEFAULT;
    const columnasPB = Math.max(
      1,
      Math.ceil(Math.sqrt((plan.locales - enPlantaAlta) * 1.6)),
    );
    const ocupadosPlaza: Local[] = [];

    for (let i = 0; i < plan.locales; i++) {
      const alta = i >= plan.locales - enPlantaAlta;
      const indice = alta ? i - (plan.locales - enPlantaAlta) : i;
      const codigo = alta
        ? `PA-${String(indice + 1).padStart(2, "0")}`
        : `${letraFila(Math.floor(indice / columnasPB))}-${String((indice % columnasPB) + 1).padStart(2, "0")}`;
      const id = `${plan.id}-${codigo}`;
      const estado = estatus[i];
      const areaM2 = rng.entero(30, 90);
      const tarifa = rng.entero(tMin, tMax) * (alta ? 0.8 : 1);
      let precio = Math.round((areaM2 * tarifa) / 10) * 10;
      const reglaLocal: ReglaActualizacion = {
        ...(rng.prob(0.04) ? { tipo: "VALOR_FIJO" as const, porcentajeFijo: 5 } : regla),
        cuando: estado === "OCUPADO" ? "ANIVERSARIO" : "ENERO",
        modo: regla.modo,
      };
      const local: Local = {
        id,
        plazaId: plan.id,
        plantaId: alta ? plantaAlta.id : plantaBaja.id,
        codigo,
        estatus: estado,
        areaM2,
        precioVigente: precio,
        precioMinimo: 0,
        regla: reglaLocal,
        geometria: (alta ? geoPA : geoPB)[indice],
        historial: [],
      };

      if (estado === "DISPONIBLE" || estado === "EN_COTIZACION") {
        // Un local liberado se reprecia con la regla acumulada desde su último contrato.
        if (rng.prob(0.6)) {
          const añoFirma = rng.entero(2021, 2025);
          const historial = [
            { fecha: `${añoFirma}-03-01`, precio, motivo: "Último contrato firmado" },
          ];
          const años = Array.from(
            { length: 2026 - añoFirma },
            (_, k) => añoFirma + 1 + k,
          );
          const reprecio = repricingAlLiberar(historial, reglaLocal, años, INPC_ANUAL);
          if (reprecio) {
            local.historial = historial;
            precio = reprecio.precioFinal;
            local.precioVigente = precio;
          }
        }
        local.libreDesde = sumarDias(DEMO_TODAY, -rng.entero(5, 150));
      }
      local.precioMinimo = minimoAutorizado(precio);

      if (estado === "OCUPADO") {
        const locatario: Locatario = crearLocatario(ctx, rng);
        salida.locatarios.push(locatario);
        local.locatarioId = locatario.id;
        local.giro = locatario.giro;
        const contrato = crearContratoGenerado(ctx, rng, {
          localId: id,
          locatarioId: locatario.id,
          rentaMensual: precio,
        });
        local.historial = [
          { fecha: contrato.contrato.inicio, precio, motivo: "Contrato firmado" },
        ];
        salida.contratos.push(contrato.contrato);
        salida.facturas.push(crearFactura(ctx, rng, contrato.contrato, contrato.atraso));
        ocupadosPlaza.push(local);
      }

      if (estado === "EN_COTIZACION") {
        folioCot += 1;
        salida.cotizaciones.push(
          cotizacionGenerada(
            rng,
            local,
            regla,
            `COT-2026-${String(folioCot).padStart(4, "0")}`,
          ),
        );
      }
      salida.locales.push(local);
    }
    salida.ocupadosPorPlaza.set(plan.id, ocupadosPlaza);
  }
  return salida;
}

interface ContratoGenerado {
  contrato: Contrato;
  /** Días de atraso si la factura del corte quedó sin pagar. */
  atraso?: number;
}

function crearContratoGenerado(
  ctx: Contexto,
  rng: Prng,
  datos: { localId: string; locatarioId: string; rentaMensual: number },
): ContratoGenerado {
  const plazo = rng.elegir(PLAZOS_MESES);
  if (rng.prob(0.045)) {
    const sorteo = rng.siguiente();
    const atraso =
      sorteo < 0.5
        ? rng.entero(1, 30)
        : sorteo < 0.8
          ? rng.entero(31, 60)
          : sorteo < 0.93
            ? rng.entero(61, 90)
            : rng.entero(91, 120);
    const vencimiento = sumarDias(DEMO_TODAY, -atraso);
    const inicio = sumarMeses(vencimiento, -rng.entero(2, 20));
    return { contrato: contratoPorInicio(ctx, datos, inicio, plazo), atraso };
  }
  const porVencer = rng.prob(0.035);
  const offset = porVencer ? rng.entero(1, 90) : rng.entero(95, plazo * 30 - 90);
  return { contrato: contratoPorFin(ctx, datos, sumarDias(DEMO_TODAY, offset), plazo) };
}

function cotizacionGenerada(
  rng: Prng,
  local: Local,
  reglaPlaza: ReglaActualizacion,
  id: string,
): Cotizacion {
  const emitida = sumarDias(DEMO_TODAY, -rng.entero(1, 10));
  return {
    id,
    localId: local.id,
    prospecto: {
      nombre: `${rng.elegir(GIROS)} ${rng.elegir(MARCAS)}`,
      documentosCompletos: rng.prob(0.8),
      aval: "Aval solidario registrado",
    },
    rentaMensual: Math.max(
      local.precioMinimo,
      Math.round((local.precioVigente - rng.entero(0, 600)) / 10) * 10,
    ),
    plazoMeses: rng.elegir(PLAZOS_MESES),
    emitidaEl: emitida,
    vigenteHasta: sumarDias(emitida, 15),
    estado: "ENVIADA",
    ...pactarRegla(local.regla, reglaPlaza),
  };
}
