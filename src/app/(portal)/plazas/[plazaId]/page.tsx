import { notFound } from "next/navigation";
import { Suspense } from "react";
import { crearSeed } from "@/data/seed";
import { PlazaDetalle } from "@/features/plaza/plaza-detalle";

const IDS_PLAZAS = crearSeed().plazas.map((p) => p.id);

export function generateStaticParams() {
  return IDS_PLAZAS.map((plazaId) => ({ plazaId }));
}

type Props = PageProps<"/plazas/[plazaId]">;

async function PlazaDeLaUrl({ params }: Pick<Props, "params">) {
  const { plazaId } = await params;
  if (!IDS_PLAZAS.includes(plazaId)) notFound();
  return <PlazaDetalle plazaId={plazaId} />;
}

export default function PaginaPlaza({ params }: Props) {
  // `params` y `useSearchParams` (?vista=) exigen una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <PlazaDeLaUrl params={params} />
    </Suspense>
  );
}
