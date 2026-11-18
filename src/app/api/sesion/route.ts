/**
 * Sesión de la demo: iniciar (POST), leer (GET) y cerrar (DELETE). La cookie
 * firmada es httpOnly; el cliente solo ve el `SesionDto`.
 */
import { NextResponse } from "next/server";
import { verificarCredenciales } from "@/server/auth/cuentas";
import {
  COOKIE_SESION,
  DURACION_SESION_MS,
  dtoDeSesion,
  errorInterno,
  firmarSesion,
  opcionesCookie,
  responder,
  secretoSesion,
  SIN_CACHE,
  sesionDeCookie,
  valorCookie,
} from "@/server/auth/sesion";
import { usuarioPorId } from "@/config/usuarios";

function credenciales(cuerpo: unknown): { usuario: string; password: string } | null {
  if (typeof cuerpo !== "object" || cuerpo === null) return null;
  const { usuario, password } = cuerpo as Record<string, unknown>;
  return typeof usuario === "string" && typeof password === "string"
    ? { usuario, password }
    : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return responder({ error: "PETICION_INVALIDA" }, 400);
  }
  const datos = credenciales(cuerpo);
  if (!datos) return responder({ error: "PETICION_INVALIDA" }, 400);

  let secreto: string;
  try {
    secreto = secretoSesion();
  } catch {
    return errorInterno();
  }

  const cuenta = verificarCredenciales(datos.usuario, datos.password);
  const usuario = cuenta ? usuarioPorId(cuenta.usuarioId) : undefined;
  if (!cuenta || !usuario) return responder({ error: "CREDENCIALES_INVALIDAS" }, 401);

  const valor = firmarSesion(
    {
      cuenta: cuenta.usuario,
      usuarioActivoId: cuenta.usuarioId,
      exp: Date.now() + DURACION_SESION_MS,
    },
    secreto,
  );
  const respuesta = responder(dtoDeSesion({ usuario, cuenta }), 200);
  respuesta.cookies.set(COOKIE_SESION, valor, opcionesCookie());
  return respuesta;
}

export async function GET(request: Request): Promise<NextResponse> {
  let sesion: ReturnType<typeof sesionDeCookie>;
  try {
    sesion = sesionDeCookie(valorCookie(request));
  } catch {
    return errorInterno();
  }
  if (!sesion) return responder({ error: "SIN_SESION" }, 401);
  return responder(dtoDeSesion(sesion), 200);
}

export async function DELETE(): Promise<NextResponse> {
  const respuesta = new NextResponse(null, { status: 204, headers: SIN_CACHE });
  respuesta.cookies.set(COOKIE_SESION, "", { ...opcionesCookie(), maxAge: 0 });
  return respuesta;
}
