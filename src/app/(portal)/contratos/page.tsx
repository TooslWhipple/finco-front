import { Contratos } from "@/features/contratos/contratos";

export default async function PaginaContratos({ searchParams }: PageProps<"/contratos">) {
  const { contrato } = await searchParams;
  return (
    <Contratos contratoInicialId={typeof contrato === "string" ? contrato : undefined} />
  );
}
