import { notFound } from "next/navigation";
import { crearSeed } from "@/data/seed";
import { LocalDetalle } from "@/features/local/local-detalle";

const PARES = crearSeed().locales.map((l) => ({ plazaId: l.plazaId, localId: l.id }));

export function generateStaticParams() {
  return PARES;
}

export default async function PaginaLocal({
  params,
}: PageProps<"/plazas/[plazaId]/locales/[localId]">) {
  const { plazaId, localId } = await params;
  if (!PARES.some((p) => p.plazaId === plazaId && p.localId === localId)) notFound();
  return <LocalDetalle plazaId={plazaId} localId={localId} />;
}
