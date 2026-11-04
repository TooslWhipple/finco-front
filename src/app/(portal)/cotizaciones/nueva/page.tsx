import { Suspense } from "react";
import { NuevaCotizacion } from "@/features/cotizacion/nueva-cotizacion";

export default function PaginaNuevaCotizacion() {
  // `useSearchParams` (?local= / ?plaza=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <NuevaCotizacion />
    </Suspense>
  );
}
