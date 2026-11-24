/**
 * Cookie de sesión firmada con HMAC-SHA256. Única fuente del nombre y los
 * atributos de la cookie: los Route Handlers y el proxy no los repiten.
 *
 * Valor: `<base64url(payload JSON)>.<base64url(HMAC-SHA256 del payload)>`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { usuarioPorId } from "@/config/usuarios";
import type { Usuario } from "@/domain";
import { cuentaHabilitada, cuentaPorUsuario, type CuentaDemo } from "./cuentas";
import type { ErrorSesion, SesionDto, SesionFirmada } from "./tipos";

type Entorno = Record<string, string | undefined>;

export const COOKIE_SESION = "finco-sesion";
export const DURACION_SESION_MS = 604_800_000;

const LONGITUD_MINIMA_SECRETO = 32;

/** Atributos de la cookie de sesión (para `NextResponse.cookies.set`). */
export function opcionesCookie(): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACION_SESION_MS / 1000,
  };
}

/**
 * Secreto de firma. Se lee en cada petición (nunca al cargar el módulo) para
 * que `next build` compile sin variables de entorno. Lanza si falta o es corto.
 */
export function secretoSesion(env: Entorno = process.env): string {
  const secreto = env.SESSION_SECRET;
  if (!secreto || secreto.length < LONGITUD_MINIMA_SECRETO) {
    throw new Error(
      `SESSION_SECRET debe existir y medir al menos ${LONGITUD_MINIMA_SECRETO} caracteres`,
    );
  }
  return secreto;
}

function firmar(payload: string, secreto: string): Buffer {
  return createHmac("sha256", secreto).update(payload).digest();
}

export function firmarSesion(s: SesionFirmada, secreto: string): string {
  const payload = Buffer.from(
    JSON.stringify({ cuenta: s.cuenta, usuarioActivoId: s.usuarioActivoId, exp: s.exp }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${firmar(payload, secreto).toString("base64url")}`;
}

function esSesionFirmada(valor: unknown): valor is SesionFirmada {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.cuenta === "string" &&
    typeof v.usuarioActivoId === "string" &&
    typeof v.exp === "number" &&
    Number.isFinite(v.exp)
  );
}

/**
 * Sesión de la cookie si la firma, el formato y el vencimiento son válidos;
 * `null` en cualquier otro caso, sin lanzar. No mira cuentas ni usuarios
 * (eso es `sesionValida`).
 */
export function leerSesion(
  valor: string | undefined,
  secreto: string,
  ahora: number = Date.now(),
): SesionFirmada | null {
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 2) return null;
  const [payload, firma] = partes as [string, string];
  const recibida = Buffer.from(firma, "base64url");
  const esperada = firmar(payload, secreto);
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) {
    return null;
  }
  let datos: unknown;
  try {
    datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!esSesionFirmada(datos) || datos.exp <= ahora) return null;
  return { cuenta: datos.cuenta, usuarioActivoId: datos.usuarioActivoId, exp: datos.exp };
}

/**
 * ¿La sesión corresponde a una cuenta vigente? La cuenta existe y está
 * habilitada (clave de enlace de al menos 32 caracteres), el usuario activo existe y, si la cuenta no puede
 * suplantar, el usuario activo es el suyo.
 */
export function sesionValida(s: SesionFirmada, env: Entorno = process.env): boolean {
  const cuenta = cuentaPorUsuario(s.cuenta);
  if (!cuenta || !cuentaHabilitada(cuenta, env)) return false;
  if (!usuarioPorId(s.usuarioActivoId)) return false;
  return cuenta.puedeSuplantar || s.usuarioActivoId === cuenta.usuarioId;
}

/**
 * Sesión completa a partir del valor de la cookie: firma, vencimiento, cuenta y
 * usuario. `null` si no hay sesión válida. Lanza si falta `SESSION_SECRET`
 * (quien llama decide: los handlers responden 500 y el proxy lo trata como sin
 * sesión).
 */
export function sesionDeCookie(
  valor: string | undefined,
  env: Entorno = process.env,
  ahora: number = Date.now(),
): { sesion: SesionFirmada; usuario: Usuario; cuenta: CuentaDemo } | null {
  const sesion = leerSesion(valor, secretoSesion(env), ahora);
  if (!sesion || !sesionValida(sesion, env)) return null;
  const cuenta = cuentaPorUsuario(sesion.cuenta);
  const usuario = usuarioPorId(sesion.usuarioActivoId);
  if (!cuenta || !usuario) return null;
  return { sesion, usuario, cuenta };
}

/** Lo que el cliente recibe de una sesión válida. */
export function dtoDeSesion(s: { usuario: Usuario; cuenta: CuentaDemo }): SesionDto {
  return {
    usuarioId: s.usuario.id,
    cuentaUsuarioId: s.cuenta.usuarioId,
    puedeSuplantar: s.cuenta.puedeSuplantar,
  };
}

/** Valor de la cookie de sesión leído del header `cookie` de la petición. */
export function valorCookie(request: Request): string | undefined {
  const encabezado = request.headers.get("cookie");
  if (!encabezado) return undefined;
  for (const par of encabezado.split(";")) {
    const separador = par.indexOf("=");
    if (separador === -1) continue;
    if (par.slice(0, separador).trim() === COOKIE_SESION) {
      return par.slice(separador + 1).trim() || undefined;
    }
  }
  return undefined;
}

/** Ninguna respuesta de sesión se cachea: llevaría la sesión de otro. */
export const SIN_CACHE = { "Cache-Control": "no-store" };

/** Respuesta JSON de los handlers de sesión, siempre sin caché. */
export function responder(cuerpo: SesionDto | ErrorSesion, status: number): NextResponse {
  return NextResponse.json(cuerpo, { status, headers: SIN_CACHE });
}

/** 500 sin cuerpo: falta el secreto o la cookie no se pudo leer. */
export function errorInterno(): NextResponse {
  return new NextResponse(null, { status: 500, headers: SIN_CACHE });
}
