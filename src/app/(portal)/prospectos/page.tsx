import { Prospectos } from "@/features/prospectos/prospectos";

export default async function PaginaProspectos({
  searchParams,
}: PageProps<"/prospectos">) {
  const { local, prospecto } = await searchParams;
  return (
    <Prospectos
      localInicialId={typeof local === "string" ? local : undefined}
      prospectoInicialId={typeof prospecto === "string" ? prospecto : undefined}
    />
  );
}
