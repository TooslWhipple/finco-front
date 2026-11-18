import { Suspense } from "react";
import { Contratos } from "@/features/contratos/contratos";

type Props = PageProps<"/contratos">;

async function ContratosDeLaUrl({ searchParams }: Pick<Props, "searchParams">) {
  const { contrato } = await searchParams;
  return (
    <Contratos contratoInicialId={typeof contrato === "string" ? contrato : undefined} />
  );
}

export default function PaginaContratos({ searchParams }: Props) {
  // `searchParams` (?contrato=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <ContratosDeLaUrl searchParams={searchParams} />
    </Suspense>
  );
}
