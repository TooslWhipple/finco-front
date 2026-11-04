import { MapaPlazas } from "@/features/mapa/mapa-plazas";

export default async function PaginaMapaDePlazas({
  searchParams,
}: PageProps<"/mapa-de-plazas">) {
  const { plaza } = await searchParams;
  return <MapaPlazas plazaInicialId={typeof plaza === "string" ? plaza : undefined} />;
}
