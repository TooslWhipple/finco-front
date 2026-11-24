/**
 * Barrera de rutas por servidor. Sin sesión válida todo lleva a `/sin-acceso`;
 * con sesión, una ruta que el rol activo no abre (o que no pertenece a ningún
 * módulo) lleva a su inicio. `GuardRuta` repite el candado en el cliente como
 * segunda capa.
 */
import { NextResponse, type NextRequest } from "next/server";
import type { Rol } from "@/domain";
import { decidirAcceso } from "@/server/auth/acceso";
import { sesionDeCookie, valorCookie } from "@/server/auth/sesion";

/** Rol de la sesión de la petición, o `null` si no hay una válida o falta el secreto. */
function rolDeSesion(request: NextRequest): Rol | null {
  try {
    return sesionDeCookie(valorCookie(request))?.usuario.rol ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest): NextResponse {
  const decision = decidirAcceso(request.nextUrl.pathname, rolDeSesion(request));
  if (decision.tipo === "pasar") return NextResponse.next();
  return NextResponse.redirect(new URL(decision.a, request.url));
}

export const config = {
  // Fuera: la API de sesión, el enlace de acceso (`/acceso/<clave>`, que valida su
  // propio route handler), todo `_next/`, las rutas internas de `next dev`, los
  // íconos y el manifiesto generados, y los archivos de `public/` por extensión
  // (no por carpeta: `public/mantenimientos/` comparte nombre con una página).
  matcher:
    "/((?!api/sesion|acceso/|_next/|__nextjs|icons/|icon$|apple-icon$|manifest\\.webmanifest$|favicon\\.ico$|.*\\.(?:png|jpe?g|webp|svg|gif|ico|txt|xml)$).*)",
};
