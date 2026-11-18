import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

type Entorno = Record<string, string | undefined>;

/**
 * Cuenta con contraseña de la demo. La contraseña no vive en el código: es el
 * valor de la variable de entorno `variablePassword`. Agregar una cuenta es
 * sumar una entrada aquí y dar de alta su variable.
 */
export interface CuentaDemo {
  /** Nombre con el que se inicia sesión (en minúsculas). */
  usuario: string;
  /** Persona de `USUARIOS_DEMO` que representa. */
  usuarioId: string;
  /** Nombre de la variable de entorno con su contraseña. */
  variablePassword: string;
  /** Puede ver la demo como cualquier otro usuario. */
  puedeSuplantar: boolean;
}

export const CUENTAS: readonly CuentaDemo[] = [
  {
    usuario: "rasek",
    usuarioId: "usr-rasek",
    variablePassword: "DEMO_PASSWORD_RASEK",
    puedeSuplantar: false,
  },
  {
    usuario: "benjamin",
    usuarioId: "usr-benjamin",
    variablePassword: "DEMO_PASSWORD_BENJAMIN",
    puedeSuplantar: false,
  },
  {
    usuario: "sergio",
    usuarioId: "usr-sergio",
    variablePassword: "DEMO_PASSWORD_SERGIO",
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

/**
 * Cuenta cuyas credenciales coinciden, o `null`. Una cuenta sin su variable de
 * contraseña no puede iniciar sesión. Las contraseñas se comparan por su
 * SHA-256 en tiempo constante, así la longitud no se filtra.
 */
export function verificarCredenciales(
  usuario: string,
  password: string,
  env: Entorno = process.env,
): CuentaDemo | null {
  const cuenta = cuentaPorUsuario(usuario);
  if (!cuenta) return null;
  const esperada = env[cuenta.variablePassword];
  if (!esperada) return null;
  return timingSafeEqual(sha256(password), sha256(esperada)) ? cuenta : null;
}
