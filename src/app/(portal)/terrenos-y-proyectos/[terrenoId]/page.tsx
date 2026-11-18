import { Suspense } from "react";
import { crearSeed } from "@/data/seed";
import { Expediente } from "@/features/obra/expediente";

const IDS_TERRENOS = crearSeed().terrenos.map((t) => t.id);

export function generateStaticParams() {
  return IDS_TERRENOS.map((terrenoId) => ({ terrenoId }));
}

type Props = PageProps<"/terrenos-y-proyectos/[terrenoId]">;

async function ExpedienteDeLaUrl({ params }: Pick<Props, "params">) {
  const { terrenoId } = await params;
  return <Expediente terrenoId={terrenoId} />;
}

export default function PaginaExpediente({ params }: Props) {
  // `params` (el terreno) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <ExpedienteDeLaUrl params={params} />
    </Suspense>
  );
}
