import type { Metadata } from "next";
import { Suspense } from "react";
import { PreciosYReglas } from "@/features/precios-reglas/precios-y-reglas";

export const metadata: Metadata = { title: "Precios y reglas | Finco" };

export default function PaginaPreciosYReglas() {
  // `useSearchParams` (?local=) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <PreciosYReglas />
    </Suspense>
  );
}
