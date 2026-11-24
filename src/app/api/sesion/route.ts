/**
 * Sesión de la demo: leer (GET). La cookie firmada la pone el enlace
 * `/acceso/[clave]`; es httpOnly y el cliente solo ve el `SesionDto`.
 */
import { NextResponse } from "next/server";
import {
  dtoDeSesion,
  errorInterno,
  responder,
  sesionDeCookie,
  valorCookie,
} from "@/server/auth/sesion";

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
