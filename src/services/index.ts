import { crearRepositoriosMock } from "./mock";
import type { Repositorios } from "./tipos";

export * from "./tipos";
export { crearRepositoriosMock } from "./mock";

let repositorios: Repositorios | undefined;

/** Repositorios de la app. Hoy son el mock; una API real se cambia aquí. */
export function obtenerRepositorios(): Repositorios {
  repositorios ??= crearRepositoriosMock();
  return repositorios;
}
