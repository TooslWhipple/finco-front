import { notFound } from "next/navigation";
import { crearSeed } from "@/data/seed";
import { PlazaDetalle } from "@/features/plaza/plaza-detalle";

const IDS_PLAZAS = crearSeed().plazas.map((p) => p.id);

export function generateStaticParams() {
  return IDS_PLAZAS.map((plazaId) => ({ plazaId }));
}

export default async function PaginaPlaza({ params }: PageProps<"/plazas/[plazaId]">) {
  const { plazaId } = await params;
  if (!IDS_PLAZAS.includes(plazaId)) notFound();
  return <PlazaDetalle plazaId={plazaId} />;
}
