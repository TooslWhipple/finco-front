import { notFound } from "next/navigation";
import { Suspense } from "react";
import { crearSeed } from "@/data/seed";
import { LocalDetalle } from "@/features/local/local-detalle";

const PARES = crearSeed().locales.map((l) => ({ plazaId: l.plazaId, localId: l.id }));

export function generateStaticParams() {
  return PARES;
}

type Props = PageProps<"/plazas/[plazaId]/locales/[localId]">;

async function LocalDeLaUrl({ params }: Pick<Props, "params">) {
  const { plazaId, localId } = await params;
  if (!PARES.some((p) => p.plazaId === plazaId && p.localId === localId)) notFound();
  return <LocalDetalle plazaId={plazaId} localId={localId} />;
}

export default function PaginaLocal({ params }: Props) {
  // `params` (plaza y local) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <LocalDeLaUrl params={params} />
    </Suspense>
  );
}
