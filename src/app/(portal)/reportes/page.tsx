import { Suspense } from "react";
import { Reportes } from "@/features/reportes/reportes";

export default function PaginaReportes() {
  // `useSearchParams` (?vista= / ?reporte=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <Reportes />
    </Suspense>
  );
}
