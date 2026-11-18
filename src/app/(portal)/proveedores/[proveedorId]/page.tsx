import { Suspense } from "react";
import { crearSeed } from "@/data/seed";
import { FichaProveedor } from "@/features/proveedores/ficha-proveedor";

const IDS_PROVEEDORES = crearSeed().proveedores.map((p) => p.id);

/**
 * Solo prerenderiza los proveedores del seed. Los que se dan de alta en la demo
 * viven en el store del navegador: se renderizan al pedirlos y el cliente
 * resuelve el id contra el padrón, por lo que no hay 404 de servidor.
 */
export function generateStaticParams() {
  return IDS_PROVEEDORES.map((proveedorId) => ({ proveedorId }));
}

type Props = PageProps<"/proveedores/[proveedorId]">;

async function ProveedorDeLaUrl({ params }: Pick<Props, "params">) {
  const { proveedorId } = await params;
  return <FichaProveedor proveedorId={proveedorId} />;
}

export default function PaginaProveedor({ params }: Props) {
  // `params` (el proveedor) exige una frontera de Suspense.
  return (
    <Suspense fallback={<p className="text-sm text-brand-text-muted">Cargando…</p>}>
      <ProveedorDeLaUrl params={params} />
    </Suspense>
  );
}
