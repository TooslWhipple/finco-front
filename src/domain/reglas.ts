import type { Cotizacion, OrigenRegla, ReglaActualizacion } from "./tipos";

/**
 * Mismo incremento (tipo y parámetros) y modo. El calendario (`cuando`) no
 * cuenta: depende de si el local está libre o rentado, no del default.
 */
export function mismoIncremento(a: ReglaActualizacion, b: ReglaActualizacion): boolean {
  return (
    a.tipo === b.tipo &&
    a.modo === b.modo &&
    (a.puntos ?? 0) === (b.puntos ?? 0) &&
    (a.porcentajeFijo ?? 0) === (b.porcentajeFijo ?? 0)
  );
}

/** Si la regla del local coincide con el default de su plaza, la hereda. */
export function origenRegla(
  regla: ReglaActualizacion,
  reglaDefault: ReglaActualizacion | undefined,
): OrigenRegla {
  if (!reglaDefault) return "SIN_DEFAULT";
  return mismoIncremento(regla, reglaDefault) ? "HEREDADA" : "PERSONALIZADA";
}

/** El default de la plaza llevado a un local: conserva el calendario del local. */
export function heredarRegla(
  regla: ReglaActualizacion,
  reglaDefault: ReglaActualizacion,
): ReglaActualizacion {
  return { ...reglaDefault, cuando: regla.cuando };
}

/**
 * Regla con la que rige un local: la suya si es propia; si hereda, el default
 * vigente de su plaza. Hereda si coincide con el default con que se dio de alta
 * (`reglaBase`) o con el vigente; así un default editado alcanza a los locales
 * que lo heredaban sin tocar a los que tienen regla propia.
 */
export function reglaEfectiva(
  regla: ReglaActualizacion,
  reglaBase: ReglaActualizacion | undefined,
  reglaVigente: ReglaActualizacion | undefined,
): ReglaActualizacion {
  if (!reglaVigente) return regla;
  const hereda =
    origenRegla(regla, reglaVigente) === "HEREDADA" ||
    origenRegla(regla, reglaBase) === "HEREDADA";
  return hereda ? heredarRegla(regla, reglaVigente) : regla;
}

/** Instantánea de la regla del local al emitir una cotización. */
export function pactarRegla(
  regla: ReglaActualizacion,
  reglaDefault: ReglaActualizacion | undefined,
): Pick<Cotizacion, "reglaPactada" | "origenRegla"> {
  return { reglaPactada: regla, origenRegla: origenRegla(regla, reglaDefault) };
}
