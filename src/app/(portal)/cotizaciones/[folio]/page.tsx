import { Suspense } from "react";
import { crearSeed } from "@/data/seed";
import { CotizacionDetalle } from "@/features/cotizacion/cotizacion-detalle";

const FOLIOS_SEED = crearSeed().cotizaciones.map((c) => c.id);

/**
 * Solo prerenderiza las cotizaciones del seed. Las que se crean en la demo
 * viven en el store del navegador: se renderizan al pedirlas y el cliente
 * resuelve el folio contra el store, por lo que no hay 404 de servidor.
 */
export function generateStaticParams() {
  return FOLIOS_SEED.map((folio) => ({ folio }));
}

type Props = PageProps<"/cotizaciones/[folio]">;

async function CotizacionDeLaUrl({ params }: Pick<Props, "params">) {
  const { folio } = await params;
  return <CotizacionDetalle folio={folio} />;
}

export default function PaginaCotizacion({ params }: Props) {
  // `params` (el folio) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <CotizacionDeLaUrl params={params} />
    </Suspense>
  );
}
