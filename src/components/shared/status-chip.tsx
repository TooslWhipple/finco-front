import { cn } from "@/lib/utils";

export type TonoChip = "verde" | "naranja" | "coral" | "indigo" | "primario" | "neutro";

const ESTILO_TONO: Record<TonoChip, { chip: string; punto: string }> = {
  verde: {
    chip: "bg-brand-secondary/15 text-brand-primary",
    punto: "bg-brand-secondary",
  },
  naranja: { chip: "bg-brand-cta/15 text-brand-primary", punto: "bg-brand-cta" },
  coral: { chip: "bg-brand-coral/15 text-brand-primary", punto: "bg-brand-coral" },
  indigo: { chip: "bg-brand-indigo/10 text-brand-indigo", punto: "bg-brand-indigo" },
  primario: { chip: "bg-brand-primary/10 text-brand-primary", punto: "bg-brand-primary" },
  neutro: { chip: "bg-brand-line text-brand-text-muted", punto: "bg-brand-text-muted" },
};

/** Mapa estatus del dominio → etiqueta y tono de marca. */
export const ESTATUS = {
  // Locales y plazas
  DISPONIBLE: { etiqueta: "Disponible", tono: "verde" },
  OCUPADO: { etiqueta: "Ocupado", tono: "primario" },
  EN_COTIZACION: { etiqueta: "En cotización", tono: "indigo" },
  PREVENTA: { etiqueta: "Preventa", tono: "indigo" },
  EN_OPERACION: { etiqueta: "En operación", tono: "verde" },
  // Cobranza
  PAGADA: { etiqueta: "Pagada", tono: "verde" },
  VIGENTE: { etiqueta: "Vigente", tono: "neutro" },
  VENCIDA: { etiqueta: "Vencida", tono: "coral" },
  // Contratos
  EN_FIRMA: { etiqueta: "En firma", tono: "indigo" },
  POR_VENCER: { etiqueta: "Por vencer", tono: "naranja" },
  VENCIDO: { etiqueta: "Vencido", tono: "coral" },
  TERMINADO: { etiqueta: "Terminado", tono: "neutro" },
  // Cotizaciones
  BORRADOR: { etiqueta: "Borrador", tono: "neutro" },
  ENVIADA: { etiqueta: "Enviada", tono: "indigo" },
  CONTRATO_GENERADO: { etiqueta: "Contrato generado", tono: "verde" },
  // Excepciones y cambios anuales
  PENDIENTE: { etiqueta: "Pendiente", tono: "naranja" },
  AUTORIZADA_DIRECCION: { etiqueta: "Autorizada por Dirección", tono: "indigo" },
  APLICADA: { etiqueta: "Aplicada", tono: "verde" },
  APROBADO: { etiqueta: "Aprobado", tono: "verde" },
  RECHAZADA: { etiqueta: "Rechazada", tono: "coral" },
  RECHAZADO: { etiqueta: "Rechazado", tono: "coral" },
  // Embudo de prospectos
  NUEVO: { etiqueta: "Nuevo", tono: "neutro" },
  CONTACTADO: { etiqueta: "Contactado", tono: "primario" },
  VISITA: { etiqueta: "Visita", tono: "indigo" },
  COTIZADO: { etiqueta: "Cotizado", tono: "naranja" },
  GANADO: { etiqueta: "Ganado", tono: "verde" },
  PERDIDO: { etiqueta: "Perdido", tono: "coral" },
  // Terrenos y proyectos
  PROSPECCION: { etiqueta: "Prospección", tono: "neutro" },
  DUE_DILIGENCE: { etiqueta: "Due diligence", tono: "primario" },
  PERMISOS: { etiqueta: "Permisos", tono: "naranja" },
  CONSTRUCCION: { etiqueta: "Construcción", tono: "naranja" },
  ABIERTO: { etiqueta: "Abierto", tono: "verde" },
  VERDE: { etiqueta: "En tiempo", tono: "verde" },
  AMARILLO: { etiqueta: "Con retraso", tono: "naranja" },
  ROJO: { etiqueta: "En riesgo", tono: "coral" },
  // Mantenimientos
  PROGRAMADO: { etiqueta: "Programado", tono: "indigo" },
  EN_PROCESO: { etiqueta: "En proceso", tono: "naranja" },
  FINALIZADO: { etiqueta: "Finalizado", tono: "verde" },
  CANCELADO: { etiqueta: "Cancelado", tono: "neutro" },
  ATRASADO: { etiqueta: "Atrasado", tono: "coral" },
  PREVENTIVO: { etiqueta: "Preventivo", tono: "primario" },
  CORRECTIVO: { etiqueta: "Correctivo", tono: "coral" },
  // Integraciones y log de sincronización
  CONECTADA: { etiqueta: "Conectada", tono: "verde" },
  CON_DIFERENCIAS: { etiqueta: "Con diferencias", tono: "naranja" },
  ERROR: { etiqueta: "Error", tono: "coral" },
  OK: { etiqueta: "Correcto", tono: "verde" },
  ADVERTENCIA: { etiqueta: "Advertencia", tono: "naranja" },
  IMPORTADO_SIMULADO: { etiqueta: "Importado de MS Project · simulado", tono: "neutro" },
  // Licitaciones de obra
  EN_CURSO: { etiqueta: "En curso", tono: "naranja" },
  ADJUDICADA: { etiqueta: "Adjudicada", tono: "verde" },
  SIN_RESPUESTA: { etiqueta: "No respondió", tono: "neutro" },
  DESCARTADO: { etiqueta: "Descartado", tono: "coral" },
  // Candados
  CUMPLE: { etiqueta: "Cumple", tono: "verde" },
  FALLA: { etiqueta: "No cumple", tono: "coral" },
  EXCEPCION: { etiqueta: "Excepción aprobada", tono: "naranja" },
} as const satisfies Record<string, { etiqueta: string; tono: TonoChip }>;

export type Estatus = keyof typeof ESTATUS;

interface StatusChipProps {
  estatus: Estatus;
  /** Sustituye la etiqueta estándar (p. ej. "Nueva · preventa"). */
  etiqueta?: string;
  className?: string;
}

export function StatusChip({ estatus, etiqueta, className }: StatusChipProps) {
  const { etiqueta: base, tono } = ESTATUS[estatus];
  const estilo = ESTILO_TONO[tono];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        estilo.chip,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", estilo.punto)} />
      {etiqueta ?? base}
    </span>
  );
}
