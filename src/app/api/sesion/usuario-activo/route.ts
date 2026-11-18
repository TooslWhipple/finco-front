/**
 * Suplantación: cambia el usuario que ve la pantalla. Solo una cuenta con
 * `puedeSuplantar` puede hacerlo; el servidor lo valida y renueva la sesión.
 */
import { NextResponse } from "next/server";
import { usuarioPorId } from "@/config/usuarios";
import {
  COOKIE_SESION,
  DURACION_SESION_MS,
  dtoDeSesion,
  errorInterno,
  firmarSesion,
  opcionesCookie,
  responder,
  secretoSesion,
  sesionDeCookie,
  valorCookie,
} from "@/server/auth/sesion";

/** `usuarioId` del cuerpo, o `null` si el JSON es inválido o no es una cadena. */
async function usuarioIdPedido(request: Request): Promise<string | null> {
  try {
    const cuerpo: unknown = await request.json();
    if (typeof cuerpo !== "object" || cuerpo === null) return null;
    const { usuarioId } = cuerpo as Record<string, unknown>;
    return typeof usuarioId === "string" ? usuarioId : null;
  } catch {
    return null;
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  let secreto: string;
  let sesion: ReturnType<typeof sesionDeCookie>;
  try {
    secreto = secretoSesion();
    sesion = sesionDeCookie(valorCookie(request));
  } catch {
    return errorInterno();
  }
  if (!sesion) return responder({ error: "SIN_SESION" }, 401);
  if (!sesion.cuenta.puedeSuplantar) return responder({ error: "SIN_PERMISO" }, 403);

  const usuarioId = await usuarioIdPedido(request);
  if (usuarioId === null) return responder({ error: "PETICION_INVALIDA" }, 400);
  const usuario = usuarioPorId(usuarioId);
  if (!usuario) return responder({ error: "USUARIO_DESCONOCIDO" }, 400);

  const valor = firmarSesion(
    {
      cuenta: sesion.cuenta.usuario,
      usuarioActivoId: usuario.id,
      exp: Date.now() + DURACION_SESION_MS,
    },
    secreto,
  );
  const respuesta = responder(dtoDeSesion({ usuario, cuenta: sesion.cuenta }), 200);
  respuesta.cookies.set(COOKIE_SESION, valor, opcionesCookie());
  return respuesta;
}
