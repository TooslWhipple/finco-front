import { nombreDeUsuario } from "@/config/usuarios";
import type { EstadoCotizacion } from "@/domain";
import { formatMoneda, formatNumero } from "@/lib/format";
import type { DatosReporte, ResultadoReporte } from "./tipos";

const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  CONTRATO_GENERADO: "Contrato generado",
};

/** "Ofertas por vendedor": una fila por oferta hecha, con quién, a qué cliente, qué local y a qué precio. */
export function reporteOfertasVendedor(datos: DatosReporte): ResultadoReporte {
  const localPorId = new Map(datos.locales.map((l) => [l.id, l]));
  const plazaPorId = new Map(datos.plazas.map((p) => [p.id, p.nombre]));
  const filas = datos.cotizaciones
    .flatMap((c) => {
      const local = localPorId.get(c.localId);
      return c.ofertas.map((o, i) => ({
        momento: `${o.fecha} ${o.hora}`,
        vendedor: nombreDeUsuario(o.vendedorId),
        cliente: c.prospecto.nombre,
        plaza: (local && plazaPorId.get(local.plazaId)) ?? "—",
        local: local?.codigo ?? c.localId,
        renta: o.rentaMensual,
        diferencia: local ? o.rentaMensual - local.precioMinimo : 0,
        oferta: i + 1,
        estado: ETIQUETA_ESTADO[c.estado],
        folio: c.id,
      }));
    })
    .toSorted(
      (a, b) => b.momento.localeCompare(a.momento) || a.folio.localeCompare(b.folio),
    );

  const porVendedor = new Map<string, number>();
  for (const f of filas)
    porVendedor.set(f.vendedor, (porVendedor.get(f.vendedor) ?? 0) + 1);
  const cotizaciones = new Set(filas.map((f) => f.folio)).size;
  return {
    resumen:
      filas.length === 0
        ? "No hay ofertas registradas en este alcance."
        : `${formatNumero(filas.length)} ofertas en ${formatNumero(cotizaciones)} cotizaciones de ${formatNumero(porVendedor.size)} vendedores; la última fue de ${formatMoneda(filas[0]!.renta)} al mes.`,
    grafica: {
      serie: "Ofertas",
      formato: "numero",
      puntos: [...porVendedor.entries()]
        .toSorted((a, b) => b[1] - a[1])
        .map(([etiqueta, valor]) => ({ etiqueta, valor, tono: "primario" as const })),
    },
    tabla: {
      columnas: [
        { clave: "momento", etiqueta: "Fecha y hora" },
        { clave: "vendedor", etiqueta: "Vendedor" },
        { clave: "cliente", etiqueta: "Cliente" },
        { clave: "plaza", etiqueta: "Plaza" },
        { clave: "local", etiqueta: "Local" },
        { clave: "renta", etiqueta: "Renta ofertada", formato: "moneda" },
        {
          clave: "diferencia",
          etiqueta: "Diferencia contra el mínimo",
          formato: "moneda",
        },
        { clave: "oferta", etiqueta: "Oferta n.º", formato: "numero" },
        { clave: "estado", etiqueta: "Estado de la cotización" },
        { clave: "folio", etiqueta: "Cotización" },
      ],
      filas,
    },
  };
}
