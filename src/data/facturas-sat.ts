import {
  DEMO_TODAY,
  ETIQUETA_CATEGORIA_MANTENIMIENTO,
  sumarDias,
  type FacturaSat,
  type FechaISO,
  type Mantenimiento,
} from "@/domain";
import { PROVEEDORES } from "./catalogo";
import { PLAZA_HEROE_ID } from "./heroe";
import { crearPrng, type Prng } from "./prng";

const SEMILLA_FACTURAS = 8841;
const TASA_IVA = 1.16;

/** RFC de persona moral con formato válido pero ficticio, por proveedor. */
const RFC_PROVEEDOR: Readonly<Record<string, string>> = {
  "prv-1": "MCO180412K35",
  "prv-2": "ESP150720QA7",
  "prv-3": "CRN120306H92",
  "prv-4": "PIS170918D41",
  "prv-5": "ICA140225L68",
  "prv-6": "LPA130611T53",
  "prv-7": "PAD160809B27",
  "prv-8": "STI190130M84",
};

/** Cuántas facturas libres y ligadas fuera de Alborada hay en el seed. */
const LIGADAS_OTRAS = 2;
const LIBRES_OTRAS = 6;
/** Alborada: facturas libres de trabajos que sí tiene en curso. */
const LIBRES_ALBORADA = [
  "Impermeabilización de azotea, ala B",
  "Reparación de equipo de clima",
];

function hex(rng: Prng, largo: number): string {
  return Array.from({ length: largo }, () => rng.entero(0, 15).toString(16)).join("");
}

/** Folio fiscal con la forma de un UUID v4 (mayúsculas). */
function uuidFicticio(rng: Prng): string {
  const variante = (8 + rng.entero(0, 3)).toString(16);
  return `${hex(rng, 8)}-${hex(rng, 4)}-4${hex(rng, 3)}-${variante}${hex(rng, 3)}-${hex(rng, 12)}`.toUpperCase();
}

const aCentavos = (n: number) => Math.round(n * 100) / 100;

function factura(
  rng: Prng,
  consecutivo: number,
  m: Mantenimiento,
  total: number,
  concepto: string,
  ligada: boolean,
): FacturaSat {
  const proveedor = PROVEEDORES.find((p) => p.id === m.proveedorId);
  const subtotal = aCentavos(total / TASA_IVA);
  const base: FechaISO = m.fechaFin ?? m.fechaInicio ?? m.fechaProgramada;
  const fecha = sumarDias(base, rng.entero(0, 2));
  return {
    id: `fsat-${String(consecutivo).padStart(3, "0")}`,
    uuid: uuidFicticio(rng),
    rfcEmisor: RFC_PROVEEDOR[m.proveedorId] ?? "XAXX010101000",
    emisor: proveedor?.nombre ?? m.proveedorId,
    fecha: fecha > DEMO_TODAY ? DEMO_TODAY : fecha,
    subtotal,
    iva: aCentavos(total - subtotal),
    total,
    concepto,
    plazaId: m.plazaId,
    mantenimientoId: ligada ? m.id : undefined,
  };
}

const concepto = (m: Mantenimiento) =>
  `${ETIQUETA_CATEGORIA_MANTENIMIENTO[m.categoria]}: ${m.titulo}`;

/** Total de una factura libre: cerca del costo del trabajo, sin igualarlo. */
const totalCercano = (rng: Prng, m: Mantenimiento) =>
  aCentavos((m.costoReal ?? m.costoEstimado) * (0.97 + rng.siguiente() * 0.06));

/**
 * ~15 CFDI recibidos simulados. Las ligadas cuadran con el costo real del trabajo
 * al que apuntan; las libres esperan en la bandeja de su plaza.
 */
export function crearFacturasSat(mantenimientos: readonly Mantenimiento[]): FacturaSat[] {
  const rng = crearPrng(SEMILLA_FACTURAS);
  const facturas: FacturaSat[] = [];
  const agregar = (m: Mantenimiento, total: number, ligada: boolean) =>
    facturas.push(factura(rng, facturas.length + 1, m, total, concepto(m), ligada));

  const deHeroe = mantenimientos.filter((m) => m.plazaId === PLAZA_HEROE_ID);
  for (const m of deHeroe.filter(
    (x) => x.estatus === "FINALIZADO" && x.costoReal !== undefined,
  ))
    agregar(m, m.costoReal!, true);
  for (const titulo of LIBRES_ALBORADA) {
    const m = deHeroe.find((x) => x.titulo === titulo);
    if (m) agregar(m, totalCercano(rng, m), false);
  }
  const material = deHeroe.find(
    (m) => m.estatus === "FINALIZADO" && m.categoria === "ELECTRICO",
  );
  if (material) {
    facturas.push({
      ...factura(rng, facturas.length + 1, material, 18_560, "", false),
      concepto: "Material eléctrico y luminarias de repuesto",
      fecha: sumarDias(DEMO_TODAY, -4),
    });
  }

  const otras = mantenimientos.filter(
    (m) =>
      m.plazaId !== PLAZA_HEROE_ID &&
      m.cargoA === "PLAZA" &&
      m.estatus === "FINALIZADO" &&
      m.costoReal !== undefined,
  );
  otras.slice(0, LIGADAS_OTRAS).forEach((m) => agregar(m, m.costoReal!, true));
  // Libres: de plazas distintas, para que cada bandeja tenga algo que ligar.
  const plazasUsadas = new Set<string>();
  for (const m of otras.slice(LIGADAS_OTRAS)) {
    if (plazasUsadas.size >= LIBRES_OTRAS) break;
    if (plazasUsadas.has(m.plazaId)) continue;
    plazasUsadas.add(m.plazaId);
    agregar(m, totalCercano(rng, m), false);
  }
  return facturas;
}
