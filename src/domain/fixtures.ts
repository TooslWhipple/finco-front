import type {
  Contrato,
  ContratoObra,
  CorteSemanal,
  Cotizacion,
  Factura,
  Licitacion,
  Local,
  Prospecto,
  ReglaActualizacion,
  Terreno,
} from "./tipos";

/** Constructores de datos mínimos para los tests de dominio. */

export const REGLA_INPC_1PT: ReglaActualizacion = {
  tipo: "INPC_PTS",
  puntos: 1,
  cuando: "ANIVERSARIO",
  modo: "SEMIAUTOMATICO",
};

export function crearLocal(parcial: Partial<Local> = {}): Local {
  return {
    id: "A-09",
    plazaId: "p1",
    plantaId: "pb",
    codigo: "A-09",
    estatus: "DISPONIBLE",
    areaM2: 60,
    precioVigente: 24_860,
    precioMinimo: 23_500,
    rentaPlaneada: 24_500,
    regla: REGLA_INPC_1PT,
    geometria: { x: 0, y: 0, w: 10, h: 10 },
    historial: [{ fecha: "2021-11-01", precio: 18_740, motivo: "Alta" }],
    ...parcial,
  };
}

export function crearCotizacion(parcial: Partial<Cotizacion> = {}): Cotizacion {
  return {
    id: "COT-2026-0418",
    localId: "A-09",
    prospecto: {
      nombre: "Prospecto Demo",
      documentosCompletos: true,
      aval: "Aval solidario registrado",
    },
    rentaMensual: 24_000,
    plazoMeses: 36,
    emitidaEl: "2026-11-01",
    vigenteHasta: "2026-11-30",
    estado: "BORRADOR",
    reglaPactada: REGLA_INPC_1PT,
    origenRegla: "HEREDADA",
    vendedorId: "usr-sofia",
    ofertas: [],
    ...parcial,
  };
}

export function crearFactura(parcial: Partial<Factura> = {}): Factura {
  return {
    id: "F-1",
    localId: "A-09",
    locatarioId: "L-1",
    mes: "2026-11",
    monto: 10_000,
    vencimiento: "2026-11-03",
    ...parcial,
  };
}

export function crearContrato(parcial: Partial<Contrato> = {}): Contrato {
  return {
    id: "ctr-1",
    localId: "A-09",
    locatarioId: "L-1",
    inicio: "2024-01-01",
    fin: "2027-01-01",
    rentaMensual: 10_000,
    estado: "VIGENTE",
    ...parcial,
  };
}

export function crearProspecto(parcial: Partial<Prospecto> = {}): Prospecto {
  return {
    id: "pro-001",
    nombre: "Prospecto Demo",
    documentosCompletos: true,
    rfc: "PDE010101AAA",
    giro: "Cafetería",
    contacto: { nombre: "Ana Demo", telefono: "667 000 0000", correo: "ana@demo.mx" },
    origen: "REFERIDO",
    etapa: "NUEVO",
    localIds: ["A-09"],
    creadoEl: "2026-10-01",
    vendedorId: "usr-sofia",
    actividad: [],
    ...parcial,
  };
}

export function crearTerreno(parcial: Partial<Terreno> = {}): Terreno {
  return {
    id: "ter-1",
    nombre: "Terreno Demo",
    ciudadId: "culiacan",
    etapa: "CONSTRUCCION",
    avancePct: 50,
    inicioDesarrollo: "2026-01-01",
    fechaObjetivo: "2027-01-01",
    responsable: "Responsable Demo",
    areaM2: 4_000,
    localesProyectados: 30,
    hitos: [],
    ...parcial,
  };
}

export function crearContratoObra(parcial: Partial<ContratoObra> = {}): ContratoObra {
  return {
    id: "co-1",
    folio: "CO-VR-01",
    terrenoId: "ter-1",
    partida: "CIMENTACION",
    contratista: "Constructora Delta",
    conceptos: [
      {
        id: "c-1",
        clave: "CIM-01",
        descripcion: "Zapatas de concreto",
        unidad: "M3",
        volumenContratado: 100,
        precioUnitario: 1_000,
      },
    ],
    inicioPlan: "2026-01-01",
    finPlan: "2026-01-11",
    anticipoPct: 0.3,
    fondoGarantiaPct: 0.05,
    ...parcial,
  };
}

/** Corte validado de 10 unidades del concepto `c-1` en la semana del lunes 2026-01-05. */
export function crearCorte(parcial: Partial<CorteSemanal> = {}): CorteSemanal {
  return {
    id: "cor-1",
    contratoObraId: "co-1",
    semana: "2026-01-05",
    volumenes: [{ conceptoId: "c-1", volumen: 10 }],
    estado: "VALIDADO_PMO",
    capturadoPor: "Héctor Ramos",
    firmadoPor: "Héctor Ramos",
    firmadoEn: "2026-01-09",
    validadoPor: "Ricardo Salas",
    validadoEn: "2026-01-12",
    evidencia: [],
    ...parcial,
  };
}

/** Licitación en curso con dos rondas: A, B y C respondieron la primera; B salió; la segunda la hicieron A y C. */
export function crearLicitacion(parcial: Partial<Licitacion> = {}): Licitacion {
  return {
    id: "ter-x-lic-01",
    folio: "LIC-X-01",
    terrenoId: "ter-x",
    partida: "MUROS",
    presupuestoBase: 1_000_000,
    invitados: ["A", "B", "C", "D"],
    descartados: [{ proveedorId: "B", ronda: 1, motivo: "Fuera de presupuesto" }],
    rondas: [
      {
        numero: 1,
        fecha: "2026-09-01",
        propuestas: [
          { proveedorId: "A", respondio: true, monto: 1_100_000 },
          { proveedorId: "B", respondio: true, monto: 1_300_000 },
          { proveedorId: "C", respondio: true, monto: 1_150_000 },
          { proveedorId: "D", respondio: false },
        ],
      },
      {
        numero: 2,
        fecha: "2026-09-15",
        propuestas: [
          { proveedorId: "A", respondio: true, monto: 1_000_000 },
          { proveedorId: "C", respondio: true, monto: 1_050_000 },
        ],
      },
    ],
    estado: "EN_CURSO",
    ...parcial,
  };
}
