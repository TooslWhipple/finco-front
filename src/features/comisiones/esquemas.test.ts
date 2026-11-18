import { describe, expect, it } from "vitest";
import { USUARIOS_DEMO } from "@/config/usuarios";
import { ESQUEMA_INICIAL } from "@/domain";
import { esquemaComisiones, MANDOS_MEDIOS_ELEGIBLES } from "./esquemas";

const inicial = { ...ESQUEMA_INICIAL, mandosMedios: [...ESQUEMA_INICIAL.mandosMedios] };

describe("esquemaComisiones", () => {
  it("acepta el esquema inicial", () => {
    expect(esquemaComisiones.safeParse(inicial)).toEqual({ success: true, data: inicial });
  });

  it("los mandos medios elegibles son los Gerentes comerciales de la demo", () => {
    expect(MANDOS_MEDIOS_ELEGIBLES).toEqual(
      USUARIOS_DEMO.filter((u) => u.rol === "GERENTE_COMERCIAL").map((u) => u.id),
    );
    expect(MANDOS_MEDIOS_ELEGIBLES).toContain("usr-jorge");
    expect(MANDOS_MEDIOS_ELEGIBLES).toContain("usr-rasek");
    expect(MANDOS_MEDIOS_ELEGIBLES).toContain("usr-benjamin");
  });

  it.each([
    ["asesor en 101 %", { asesorPct: 101 }, "asesorPct"],
    ["asesor en -1 %", { asesorPct: -1 }, "asesorPct"],
    ["bono en 101 %", { bonoSinExcepcionPct: 101 }, "bonoSinExcepcionPct"],
    ["mando medio en -1 %", { mandoMedioPct: -1 }, "mandoMedioPct"],
    ["un porcentaje vacío (NaN)", { asesorPct: Number.NaN }, "asesorPct"],
    ["sin mandos medios", { mandosMedios: [] }, "mandosMedios"],
    ["un mando medio repetido", { mandosMedios: ["usr-jorge", "usr-jorge"] }, "mandosMedios"],
    ["un mando medio que no es Gerente comercial", { mandosMedios: ["usr-sofia"] }, "mandosMedios"],
  ])("rechaza %s", (_caso, parche, campo) => {
    const r = esquemaComisiones.safeParse({ ...inicial, ...parche });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toContain(campo);
  });

  it("acepta 0 y 100 % y a los Gerentes comerciales", () => {
    const r = esquemaComisiones.safeParse({
      asesorPct: 100,
      bonoSinExcepcionPct: 0,
      mandoMedioPct: 2.5,
      mandosMedios: ["usr-jorge", "usr-rasek", "usr-benjamin"],
    });
    expect(r.success).toBe(true);
  });
});
