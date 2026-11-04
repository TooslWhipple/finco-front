import { Reportes } from "@/features/reportes/reportes";

export default async function PaginaReportes({ searchParams }: PageProps<"/reportes">) {
  const { vista } = await searchParams;
  return <Reportes vistaInicial={vista === "asistente" ? "ASISTENTE" : "REPORTES"} />;
}
