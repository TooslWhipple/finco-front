import { describe, expect, it } from "vitest";
import { REGLA_INPC_1PT } from "./fixtures";
import { heredarRegla, origenRegla, pactarRegla, reglaEfectiva } from "./reglas";
import type { ReglaActualizacion } from "./tipos";

const FIJO_7: ReglaActualizacion = {
  tipo: "VALOR_FIJO",
  porcentajeFijo: 7,
  cuando: "ANIVERSARIO",
  modo: "SEMIAUTOMATICO",
};
/** Local libre que hereda el default: mismo incremento, calendario de enero. */
const LIBRE_HEREDA: ReglaActualizacion = { ...REGLA_INPC_1PT, cuando: "ENERO" };
const PROPIA: ReglaActualizacion = { ...REGLA_INPC_1PT, puntos: 2 };

describe("origenRegla", () => {
  it("distingue heredada, personalizada y sin default", () => {
    expect(origenRegla(REGLA_INPC_1PT, { ...REGLA_INPC_1PT })).toBe("HEREDADA");
    expect(origenRegla(PROPIA, REGLA_INPC_1PT)).toBe("PERSONALIZADA");
    expect(origenRegla(REGLA_INPC_1PT, undefined)).toBe("SIN_DEFAULT");
  });
  it("el calendario no cuenta: un local libre hereda aunque aplique cada enero", () => {
    expect(origenRegla(LIBRE_HEREDA, REGLA_INPC_1PT)).toBe("HEREDADA");
  });
  it("el modo sí cuenta", () => {
    expect(origenRegla({ ...REGLA_INPC_1PT, modo: "AUTOMATICO" }, REGLA_INPC_1PT)).toBe(
      "PERSONALIZADA",
    );
  });
});

describe("heredarRegla", () => {
  it("toma el incremento y el modo del default y conserva el calendario del local", () => {
    expect(heredarRegla(LIBRE_HEREDA, FIJO_7)).toEqual({ ...FIJO_7, cuando: "ENERO" });
  });
});

describe("reglaEfectiva", () => {
  it("sin default editado, el local conserva su regla", () => {
    expect(reglaEfectiva(LIBRE_HEREDA, REGLA_INPC_1PT, REGLA_INPC_1PT)).toEqual(
      LIBRE_HEREDA,
    );
  });
  it("el local que heredaba toma el default editado de su plaza", () => {
    expect(reglaEfectiva(LIBRE_HEREDA, REGLA_INPC_1PT, FIJO_7)).toEqual({
      ...FIJO_7,
      cuando: "ENERO",
    });
  });
  it("el local con regla propia no cambia al editar el default", () => {
    expect(reglaEfectiva(PROPIA, REGLA_INPC_1PT, FIJO_7)).toBe(PROPIA);
  });
  it("el local que ya adoptó el default editado lo sigue heredando", () => {
    const adoptada = heredarRegla(LIBRE_HEREDA, FIJO_7);
    expect(reglaEfectiva(adoptada, REGLA_INPC_1PT, FIJO_7)).toEqual(adoptada);
  });
  it("sin default en la plaza, rige la regla del local", () => {
    expect(reglaEfectiva(PROPIA, undefined, undefined)).toBe(PROPIA);
  });
});

describe("pactarRegla", () => {
  it("congela la regla y su origen al emitir", () => {
    expect(pactarRegla({ ...FIJO_7, cuando: "ENERO" }, FIJO_7)).toEqual({
      reglaPactada: { ...FIJO_7, cuando: "ENERO" },
      origenRegla: "HEREDADA",
    });
    expect(pactarRegla(PROPIA, FIJO_7)).toEqual({
      reglaPactada: PROPIA,
      origenRegla: "PERSONALIZADA",
    });
  });
});
