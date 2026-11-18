import { Suspense } from "react";
import { Prospectos } from "@/features/prospectos/prospectos";

type Props = PageProps<"/prospectos">;

async function ProspectosDeLaUrl({ searchParams }: Pick<Props, "searchParams">) {
  const { local, prospecto } = await searchParams;
  return (
    <Prospectos
      localInicialId={typeof local === "string" ? local : undefined}
      prospectoInicialId={typeof prospecto === "string" ? prospecto : undefined}
    />
  );
}

export default function PaginaProspectos({ searchParams }: Props) {
  // `searchParams` (?local= / ?prospecto=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <ProspectosDeLaUrl searchParams={searchParams} />
    </Suspense>
  );
}
