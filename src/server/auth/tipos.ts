/**
 * Tipos de la sesión de la demo. Sin "server-only": el store de sesión del
 * cliente los importa con `import type` para leer la respuesta de `/api/sesion`.
 */

/** Lo que va firmado dentro de la cookie `finco-sesion`. */
export interface SesionFirmada {
  /** Cuenta que se autenticó (`CuentaDemo.usuario`). */
  cuenta: string;
  /** Usuario demo que ve la pantalla; distinto de la cuenta solo si puede suplantar. */
  usuarioActivoId: string;
  /** Vencimiento en epoch ms. */
  exp: number;
}

/** Respuesta de `/api/sesion` y `/api/sesion/usuario-activo`. */
export interface SesionDto {
  usuarioId: string;
  cuentaUsuarioId: string;
  puedeSuplantar: boolean;
}

export type ErrorSesion = {
  error:
    | "CREDENCIALES_INVALIDAS"
    | "SIN_SESION"
    | "SIN_PERMISO"
    | "USUARIO_DESCONOCIDO"
    | "PETICION_INVALIDA";
};
