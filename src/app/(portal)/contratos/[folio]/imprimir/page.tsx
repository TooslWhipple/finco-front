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

export default async function PaginaContratoImprimible({
  params,
}: PageProps<"/contratos/[folio]/imprimir">) {
  const { folio } = await params;
  return <ContratoImprimible folio={folio} />;
}
