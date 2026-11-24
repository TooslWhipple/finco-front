/**
 * Enlace secreto de cada cuenta: `GET /acceso/<clave>`. Con una clave válida
 * firma la cookie de sesión y redirige al inicio del rol, de modo que la clave
 * no queda en la barra del navegador. Cualquier otro caso va a `/sin-acceso`
 * sin decir por qué. Sin `generateStaticParams`: nunca se prerenderiza.
 */
import { NextResponse } from "next/server";
import { INICIO_POR_ROL, RUTA_SIN_ACCESO } from "@/config/acceso-rutas";
import { usuarioPorId } from "@/config/usuarios";
import { cuentaPorClave } from "@/server/auth/cuentas";
import {
  COOKIE_SESION,
  DURACION_SESION_MS,
  errorInterno,
  firmarSesion,
  opcionesCookie,
  secretoSesion,
  SIN_CACHE,
} from "@/server/auth/sesion";

const CABECERAS = { ...SIN_CACHE, "Referrer-Policy": "no-referrer" };

function redirigir(destino: string, request: Request): NextResponse {
  return NextResponse.redirect(new URL(destino, request.url), {
    status: 303,
    headers: CABECERAS,
  });
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/acceso/[clave]">,
): Promise<NextResponse> {
  const { clave } = await ctx.params;

  let secreto: string;
  try {
    secreto = secretoSesion();
  } catch {
    return errorInterno();
  }

  const cuenta = cuentaPorClave(clave);
  const usuario = cuenta ? usuarioPorId(cuenta.usuarioId) : undefined;
  if (!cuenta || !usuario) return redirigir(RUTA_SIN_ACCESO, request);

  const valor = firmarSesion(
    {
      cuenta: cuenta.usuario,
      usuarioActivoId: cuenta.usuarioId,
      exp: Date.now() + DURACION_SESION_MS,
    },
    secreto,
  );
  const respuesta = redirigir(INICIO_POR_ROL[usuario.rol], request);
  respuesta.cookies.set(COOKIE_SESION, valor, opcionesCookie());
  return respuesta;
}
