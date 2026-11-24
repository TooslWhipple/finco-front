import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

type Entorno = Record<string, string | undefined>;

/** Largo mínimo de una clave de enlace; una más corta deja la cuenta sin acceso. */
export const LONGITUD_MINIMA_CLAVE = 32;

/**
 * Cuenta de la demo que entra con un enlace secreto. La clave no vive en el
 * código: es el valor de la variable de entorno `variableClave`. Agregar una
 * cuenta es sumar una entrada aquí y dar de alta su variable.
 */
export interface CuentaDemo {
  /** Identificador de la cuenta (en minúsculas); es el que guarda la cookie de sesión. */
  usuario: string;
  /** Persona de `USUARIOS_DEMO` que representa. */
  usuarioId: string;
  /** Nombre de la variable de entorno con la clave de su enlace. */
  variableClave: string;
  /** Puede ver la demo como cualquier otro usuario. */
  puedeSuplantar: boolean;
}

export const CUENTAS: readonly CuentaDemo[] = [
  {
    usuario: "rasek",
    usuarioId: "usr-rasek",
    variableClave: "DEMO_CLAVE_RASEK",
    puedeSuplantar: false,
  },
  {
    usuario: "benjamin",
    usuarioId: "usr-benjamin",
    variableClave: "DEMO_CLAVE_BENJAMIN",
    puedeSuplantar: false,
  },
  {
    usuario: "sergio",
    usuarioId: "usr-sergio",
    variableClave: "DEMO_CLAVE_SERGIO",
    puedeSuplantar: true,
  },
];

function normalizarUsuario(usuario: string): string {
  return usuario.trim().toLowerCase();
}

function sha256(texto: string): Buffer {
  return createHash("sha256").update(texto, "utf8").digest();
}

/** Cuenta por su nombre de usuario (con trim y sin distinguir mayúsculas). */
export function cuentaPorUsuario(usuario: string): CuentaDemo | null {
  const buscado = normalizarUsuario(usuario);
  return CUENTAS.find((c) => c.usuario === buscado) ?? null;
}

/** ¿La cuenta tiene clave en el entorno y mide al menos `LONGITUD_MINIMA_CLAVE`? */
export function cuentaHabilitada(
  cuenta: CuentaDemo,
  env: Entorno = process.env,
): boolean {
  const clave = env[cuenta.variableClave];
  return clave !== undefined && clave.length >= LONGITUD_MINIMA_CLAVE;
}

/**
 * Cuenta habilitada cuya clave coincide, o `null`. Las claves se comparan por su
 * SHA-256 en tiempo constante, así la longitud no se filtra.
 */
export function cuentaPorClave(
  clave: string,
  env: Entorno = process.env,
): CuentaDemo | null {
  const recibida = sha256(clave);
  let encontrada: CuentaDemo | null = null;
  for (const cuenta of CUENTAS) {
    if (!cuentaHabilitada(cuenta, env)) continue;
    const esperada = sha256(env[cuenta.variableClave] as string);
    if (timingSafeEqual(recibida, esperada) && encontrada === null) {
      encontrada = cuenta;
    }
  }
  return encontrada;
}
