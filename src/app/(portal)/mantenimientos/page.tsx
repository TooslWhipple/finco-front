import { Suspense } from "react";
import { Mantenimientos } from "@/features/mantenimientos/mantenimientos";

type Props = PageProps<"/mantenimientos">;

async function MantenimientosDeLaUrl({ searchParams }: Pick<Props, "searchParams">) {
  const { mantenimiento } = await searchParams;
  return (
    <Mantenimientos
      mantenimientoInicialId={
        typeof mantenimiento === "string" ? mantenimiento : undefined
      }
    />
  );
}

export default function PaginaMantenimientos({ searchParams }: Props) {
  // `searchParams` (?mantenimiento=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <MantenimientosDeLaUrl searchParams={searchParams} />
    </Suspense>
  );
}
