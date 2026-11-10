import { StatusChip } from "@/components/shared";
import type { Mantenimiento } from "@/domain";

/**
 * Chip del sobregiro que aún estorba: pendiente de Dirección o rechazado. Un
 * sobregiro autorizado no lleva chip en listas (el detalle cuenta su historia).
 */
export function ChipSobregiro({
  mantenimiento,
}: {
  mantenimiento: Pick<Mantenimiento, "autorizacionSobregiro">;
}) {
  switch (mantenimiento.autorizacionSobregiro?.estado) {
    case "PENDIENTE":
      return <StatusChip estatus="REQUIERE_AUTORIZACION" />;
    case "RECHAZADA":
      return <StatusChip estatus="RECHAZADA" etiqueta="Sobregiro rechazado" />;
    default:
      return null;
  }
}
