import type {
  Contrato,
  Cotizacion,
  Factura,
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
