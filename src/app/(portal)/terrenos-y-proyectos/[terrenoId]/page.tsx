import { crearSeed } from "@/data/seed";
import { Expediente } from "@/features/obra/expediente";

const IDS_TERRENOS = crearSeed().terrenos.map((t) => t.id);

export function generateStaticParams() {
  return IDS_TERRENOS.map((terrenoId) => ({ terrenoId }));
}

export default async function PaginaExpediente({
  params,
}: PageProps<"/terrenos-y-proyectos/[terrenoId]">) {
  const { terrenoId } = await params;
  return <Expediente terrenoId={terrenoId} />;
}
