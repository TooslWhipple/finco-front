import { Suspense } from "react";
import { TerrenosYProyectos } from "@/features/terrenos/terrenos-y-proyectos";

type Props = PageProps<"/terrenos-y-proyectos">;

async function TerrenosDeLaUrl({ searchParams }: Pick<Props, "searchParams">) {
  const { terreno } = await searchParams;
  return (
    <TerrenosYProyectos
      terrenoInicialId={typeof terreno === "string" ? terreno : undefined}
    />
  );
}

export default function PaginaTerrenos({ searchParams }: Props) {
  // `searchParams` (?terreno=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <TerrenosDeLaUrl searchParams={searchParams} />
    </Suspense>
  );
}
