import { Suspense } from "react";
import { crearSeed } from "@/data/seed";
import { ContratoImprimible } from "@/features/contratos/contrato-imprimible";

const FOLIOS_SEED = crearSeed().contratos.map((c) => c.folio ?? c.id);

/**
 * Prerenderiza los contratos del seed. Los que nacen en la demo viven en el
 * store del navegador: el cliente resuelve el folio contra el store.
 */
export function generateStaticParams() {
  return FOLIOS_SEED.map((folio) => ({ folio }));
}

type Props = PageProps<"/contratos/[folio]/imprimir">;

async function ContratoDeLaUrl({ params }: Pick<Props, "params">) {
  const { folio } = await params;
  return <ContratoImprimible folio={folio} />;
}

export default function PaginaContratoImprimible({ params }: Props) {
  // `params` (el folio) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <ContratoDeLaUrl params={params} />
    </Suspense>
  );
}
