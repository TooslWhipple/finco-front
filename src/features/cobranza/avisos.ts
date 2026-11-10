import {
  diasAtraso,
  type Ejecucion,
  type Factura,
  type FechaISO,
  type PlantillaAviso,
} from "@/domain";
import { formatDiaMes, formatMoneda } from "@/lib/format";

/** Variables que admite el cuerpo (y el asunto) de una plantilla. */
export const VARIABLES_PLANTILLA = [
  "locatario",
  "local",
  "plaza",
  "monto",
  "vencimiento",
  "diasAtraso",
  "folio",
] as const;

export interface ContextoAviso {
  locatario: string;
  /** Código del local. */
  local: string;
  plaza: string;
  hoy: FechaISO;
}

export interface MensajeAviso {
  asunto?: string;
  cuerpo: string;
}

/** Rellena `{variables}` con los datos de la factura; una variable desconocida se deja tal cual. */
function rellenar(texto: string, valores: Record<string, string>): string {
  return texto.replace(/\{(\w+)\}/g, (completo, nombre: string) =>
    nombre in valores ? valores[nombre] : completo,
  );
}

export function renderPlantilla(
  plantilla: Pick<PlantillaAviso, "asunto" | "cuerpo">,
  factura: Factura,
  contexto: ContextoAviso,
): MensajeAviso {
  const valores: Record<string, string> = {
    locatario: contexto.locatario,
    local: contexto.local,
    plaza: contexto.plaza,
    monto: formatMoneda(factura.monto),
    vencimiento: formatDiaMes(factura.vencimiento),
    diasAtraso: String(diasAtraso(factura, contexto.hoy)),
    folio: factura.folio ?? factura.id,
  };
  return {
    asunto:
      plantilla.asunto === undefined ? undefined : rellenar(plantilla.asunto, valores),
    cuerpo: rellenar(plantilla.cuerpo, valores),
  };
}

/** "viernes 6 nov, 07:00". */
export function formatEjecucion({ fecha, hora }: Ejecucion): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const dia = new Date(a, m - 1, d)
    .toLocaleDateString("es-MX", { weekday: "long" })
    .replace(/\./g, "");
  return `${dia} ${Number(fecha.slice(8, 10))} ${formatDiaMes(fecha).split(" ")[1]}, ${hora}`;
}
