import { Suspense } from "react";
import { MapaPlazas } from "@/features/mapa/mapa-plazas";

type Props = PageProps<"/mapa-de-plazas">;

async function MapaDeLaUrl({ searchParams }: Pick<Props, "searchParams">) {
  const { plaza } = await searchParams;
  return <MapaPlazas plazaInicialId={typeof plaza === "string" ? plaza : undefined} />;
}

export default function PaginaMapaDePlazas({ searchParams }: Props) {
  // `searchParams` (?plaza=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <MapaDeLaUrl searchParams={searchParams} />
    </Suspense>
  );
}
