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

export default async function PaginaLicitacionContratista({
  params,
}: PageProps<"/mis-licitaciones/[id]">) {
  const { id } = await params;
  return <ResponderLicitacion id={id} />;
}
