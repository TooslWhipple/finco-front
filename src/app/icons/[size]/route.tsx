import { iconoApp } from "@/lib/icono-app";

const LADOS = [192, 512] as const;

export function generateStaticParams() {
  return LADOS.map((lado) => ({ size: String(lado) }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const lado = LADOS.find((l) => String(l) === size);
  if (!lado) return new Response("No encontrado", { status: 404 });
  return iconoApp(lado);
}
