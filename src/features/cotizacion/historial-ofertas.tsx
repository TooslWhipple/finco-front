import { Timeline, type EventoTimeline } from "@/components/shared";
import { nombreDeUsuario } from "@/config/usuarios";
import { diferenciaContraAnterior, type OfertaCotizacion } from "@/domain";
import { formatFecha, formatMoneda } from "@/lib/format";

function detalleDe(o: OfertaCotizacion): string {
  const gracia = o.mesesGracia
    ? ` · ${o.mesesGracia} ${o.mesesGracia === 1 ? "mes" : "meses"} de gracia`
    : "";
  return `${o.plazoMeses} meses${gracia}`;
}

function textoDiferencia(dif: number | null): string {
  if (dif === null) return "Oferta inicial";
  if (dif === 0) return "Misma renta que la oferta anterior";
  return `${dif > 0 ? "+" : "-"}${formatMoneda(Math.abs(dif))} contra la oferta anterior`;
}

/** Historial de ofertas de la cotización: la inicial y cada renegociación, de la más reciente a la más antigua. */
export function HistorialOfertas({ ofertas }: { ofertas: readonly OfertaCotizacion[] }) {
  const eventos: EventoTimeline[] = ofertas
    .map((o, i) => ({
      id: o.id,
      titulo: `Oferta ${i + 1}: ${formatMoneda(o.rentaMensual)} / mes`,
      detalle: `${nombreDeUsuario(o.vendedorId)} · ${detalleDe(o)} · ${textoDiferencia(diferenciaContraAnterior(ofertas, i))}`,
      fecha: `${formatFecha(o.fecha)} · ${o.hora}`,
      tono: i === ofertas.length - 1 ? ("naranja" as const) : ("neutro" as const),
    }))
    .reverse();
  return <Timeline eventos={eventos} />;
}
