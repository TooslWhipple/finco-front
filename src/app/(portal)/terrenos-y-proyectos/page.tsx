import { TerrenosYProyectos } from "@/features/terrenos/terrenos-y-proyectos";

export default async function PaginaTerrenos({
  searchParams,
}: PageProps<"/terrenos-y-proyectos">) {
  const { terreno } = await searchParams;
  return (
    <TerrenosYProyectos
      terrenoInicialId={typeof terreno === "string" ? terreno : undefined}
    />
  );
}
