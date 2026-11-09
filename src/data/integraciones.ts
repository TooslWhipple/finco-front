import {
  DEMO_TODAY,
  sumarDias,
  type DiferenciaConciliacion,
  type EventoSync,
  type Factura,
  type Integracion,
  type Local,
  type Terreno,
} from "@/domain";
import { formatMoneda, formatNumero } from "@/lib/format";

const AYER = sumarDias(DEMO_TODAY, -1);
const HACE_2_DIAS = sumarDias(DEMO_TODAY, -2);

export interface ConectoresSeed {
  integraciones: Integracion[];
  /** Log inicial, del más antiguo al más reciente. */
  eventosSync: EventoSync[];
}

interface Insumos {
  facturas: readonly Factura[];
  diferencias: readonly DiferenciaConciliacion[];
  locales: readonly Local[];
  terrenos: readonly Terreno[];
  /** Actividades de cronograma que "importa" MS Project. */
  actividadesCronograma: number;
  /** Último sync de EnKontrol (ISO con hora). */
  ultimoSyncEnKontrol: string;
}

/**
 * Las tres integraciones de la demo (EnKontrol, Excel y Monday) con su log
 * inicial. Las cifras salen de los datos del seed, no se escriben fijas.
 */
export function crearConectores(insumos: Insumos): ConectoresSeed {
  const {
    facturas,
    diferencias,
    locales,
    terrenos,
    actividadesCronograma,
    ultimoSyncEnKontrol,
  } = insumos;
  const pagadas = facturas.filter((f) => f.pagadaEl).length;
  const montoDiferencias = diferencias.reduce((s, d) => s + d.monto, 0);
  const ultimoSyncExcel = `${AYER}T09:10:00`;
  const ultimoSyncMonday = `${DEMO_TODAY}T14:30:00`;
  const ultimoSyncProject = `${DEMO_TODAY}T16:10:00`;
  const enDesarrollo = terrenos.filter((t) => t.etapa !== "ABIERTO").length;

  const integraciones: Integracion[] = [
    {
      id: "ENKONTROL",
      nombre: "EnKontrol",
      descripcion: "Contabilidad y facturación CFDI: facturas, pagos y pólizas.",
      estado: diferencias.length > 0 ? "CON_DIFERENCIAS" : "CONECTADA",
      ultimoSync: ultimoSyncEnKontrol,
      metricas: [
        { etiqueta: "Facturas timbradas", valor: formatNumero(facturas.length) },
        { etiqueta: "Pagos aplicados", valor: formatNumero(pagadas) },
        {
          etiqueta: "Diferencias por conciliar",
          valor: formatNumero(diferencias.length),
        },
      ],
    },
    {
      id: "EXCEL",
      nombre: "Excel",
      descripcion: "Importación del rent roll: locales, rentas y contratos.",
      estado: "CONECTADA",
      ultimoSync: ultimoSyncExcel,
      metricas: [
        { etiqueta: "Locales importados", valor: formatNumero(locales.length) },
        { etiqueta: "Archivo", valor: "rent-roll-nov-2026.xlsx" },
      ],
    },
    {
      id: "MONDAY",
      nombre: "Monday",
      descripcion: "Seguimiento de proyectos y terrenos en desarrollo.",
      estado: "CONECTADA",
      ultimoSync: ultimoSyncMonday,
      metricas: [
        { etiqueta: "Proyectos sincronizados", valor: formatNumero(terrenos.length) },
        { etiqueta: "En desarrollo", valor: formatNumero(enDesarrollo) },
      ],
    },
    {
      id: "MSPROJECT",
      nombre: "Microsoft Project",
      descripcion: "Cronogramas de obra: actividades, fechas y dependencias (simulado).",
      estado: "CONECTADA",
      ultimoSync: ultimoSyncProject,
      metricas: [
        {
          etiqueta: "Actividades importadas",
          valor: formatNumero(actividadesCronograma),
        },
        { etiqueta: "Archivo", valor: "cronograma-obra.mpp" },
      ],
    },
  ];

  const eventosSync: EventoSync[] = [
    {
      id: "sync-01",
      integracionId: "ENKONTROL",
      fecha: `${HACE_2_DIAS}T15:50:00`,
      resultado: "OK",
      detalle: "Facturas y pagos sincronizados sin diferencias",
      registros: facturas.length,
    },
    {
      id: "sync-02",
      integracionId: "EXCEL",
      fecha: `${HACE_2_DIAS}T09:05:00`,
      resultado: "OK",
      detalle: "Rent roll importado desde rent-roll-oct-2026.xlsx",
      registros: locales.length,
    },
    {
      id: "sync-03",
      integracionId: "MONDAY",
      fecha: `${AYER}T14:25:00`,
      resultado: "OK",
      detalle: "Tablero de proyectos actualizado",
      registros: terrenos.length,
    },
    {
      id: "sync-04",
      integracionId: "ENKONTROL",
      fecha: `${AYER}T15:48:00`,
      resultado: "ADVERTENCIA",
      detalle: `${diferencias.length} diferencias de conciliación por ${formatMoneda(montoDiferencias)}`,
      registros: facturas.length,
    },
    {
      id: "sync-05",
      integracionId: "EXCEL",
      fecha: ultimoSyncExcel,
      resultado: "OK",
      detalle: "Rent roll importado desde rent-roll-nov-2026.xlsx",
      registros: locales.length,
    },
    {
      id: "sync-06",
      integracionId: "MONDAY",
      fecha: ultimoSyncMonday,
      resultado: "OK",
      detalle: "Tablero de proyectos actualizado",
      registros: terrenos.length,
    },
    {
      id: "sync-07",
      integracionId: "ENKONTROL",
      fecha: ultimoSyncEnKontrol,
      resultado: diferencias.length > 0 ? "ADVERTENCIA" : "OK",
      detalle:
        diferencias.length > 0
          ? `${diferencias.length} diferencias de conciliación por ${formatMoneda(montoDiferencias)}`
          : "Facturas y pagos sincronizados sin diferencias",
      registros: facturas.length,
    },
    {
      id: "sync-08",
      integracionId: "MSPROJECT",
      fecha: ultimoSyncProject,
      resultado: "OK",
      detalle: "Cronograma de obra importado desde cronograma-obra.mpp (simulado)",
      registros: actividadesCronograma,
    },
  ];
  return { integraciones, eventosSync };
}
