import { Suspense } from "react";
import { crearSeed } from "@/data/seed";
import { ResponderLicitacion } from "@/features/mis-licitaciones/responder-licitacion";

const IDS_SEED = crearSeed().licitaciones.map((l) => l.id);

/**
 * Solo prerenderiza las licitaciones del seed; el cliente resuelve el id contra
 * el store (y contra las invitaciones del contratista), igual que el detalle de
 * cotización.
 */
export function generateStaticParams() {
  return IDS_SEED.map((id) => ({ id }));
}

type Props = PageProps<"/mis-licitaciones/[id]">;

async function LicitacionDeLaUrl({ params }: Pick<Props, "params">) {
  const { id } = await params;
  return <ResponderLicitacion id={id} />;
}

export default function PaginaLicitacionContratista({ params }: Props) {
  // `params` (la licitación) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <LicitacionDeLaUrl params={params} />
    </Suspense>
  );
}
