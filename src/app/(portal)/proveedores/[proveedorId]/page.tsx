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

export default async function PaginaProveedor({
  params,
}: PageProps<"/proveedores/[proveedorId]">) {
  const { proveedorId } = await params;
  return <FichaProveedor proveedorId={proveedorId} />;
}
