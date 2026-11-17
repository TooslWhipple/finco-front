import { describe, expect, it } from "vitest";
import { crearContratoObra, crearLicitacion, crearProveedor } from "./fixtures";
import { montoContrato } from "./obra";
import {
  historialProveedor,
  proveedoresDeMantenimiento,
  proveedoresDePartida,
  rfcEnUso,
  siguienteIdProveedor,
} from "./proveedores";
import type { Mantenimiento } from "./tipos";

function mnt(parche: Partial<Mantenimiento> = {}): Mantenimiento {
  return {
    id: "mnt-0001",
    folio: "MNT-2026-0001",
    plazaId: "p1",
    titulo: "Pintura",
    descripcion: "",
    tipo: "PREVENTIVO",
    categoria: "PINTURA",
    origen: "ADMINISTRACION",
    estatus: "PROGRAMADO",
    proveedorId: "prv-1",
    fechaProgramada: "2026-11-10",
    costoEstimado: 1000,
    cargoA: "PLAZA",
    evidencia: [],
    ...parche,
  };
}

describe("historialProveedor", () => {
  const mantenimientos = [
    mnt({ id: "m1", estatus: "FINALIZADO", costoEstimado: 1000, costoReal: 1200 }),
    mnt({ id: "m2", estatus: "FINALIZADO", plazaId: "p2", costoEstimado: 500 }),
    mnt({
      id: "m3",
      estatus: "FINALIZADO",
      categoria: "IMPERMEABILIZACION",
      costoEstimado: 3000,
    }),
    mnt({ id: "m4", estatus: "CANCELADO", costoEstimado: 9000 }),
    mnt({ id: "m5", estatus: "EN_PROCESO", costoEstimado: 700 }),
    mnt({ id: "m6", estatus: "FINALIZADO", proveedorId: "prv-2", costoEstimado: 800 }),
  ];

  it("suma lo cobrado solo de los FINALIZADO, en total, por plaza y por categoría", () => {
    const h = historialProveedor("prv-1", mantenimientos, [], []);
    expect(h.trabajos.map((m) => m.id)).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(h.cobrado).toBe(1200 + 500 + 3000);
    expect(h.finalizados).toBe(3);
    expect(h.cobradoPorPlaza).toEqual([
      { clave: "p1", monto: 4200 },
      { clave: "p2", monto: 500 },
    ]);
    expect(h.cobradoPorCategoria).toEqual([
      { clave: "IMPERMEABILIZACION", monto: 3000 },
      { clave: "PINTURA", monto: 1700 },
    ]);
  });

  it("lista sus contratos de obra con su monto y las licitaciones donde fue invitado o ganó", () => {
    const propio = crearContratoObra({ id: "co-1", proveedorId: "prv-obra-01" });
    const ajeno = crearContratoObra({ id: "co-2", proveedorId: "prv-obra-02" });
    const invitado = crearLicitacion({ id: "lic-1", invitados: ["prv-obra-01", "X"] });
    const gano = crearLicitacion({
      id: "lic-2",
      invitados: ["Y"],
      ganadorId: "prv-obra-01",
    });
    const otra = crearLicitacion({ id: "lic-3", invitados: ["Y"] });
    const h = historialProveedor(
      "prv-obra-01",
      [],
      [propio, ajeno],
      [invitado, gano, otra],
    );
    expect(h.contratos).toEqual([{ contrato: propio, monto: montoContrato(propio) }]);
    expect(h.licitaciones.map((l) => [l.licitacion.id, l.invitado, l.ganador])).toEqual([
      ["lic-1", true, false],
      ["lic-2", false, true],
    ]);
    expect(h.cobrado).toBe(0);
  });
});

describe("filtros del padrón", () => {
  it("proveedoresDeMantenimiento excluye inactivos y a quien no atiende la plaza o la categoría", () => {
    const padron = [
      crearProveedor({ id: "ok" }),
      crearProveedor({ id: "inactivo", activo: false }),
      crearProveedor({ id: "otra-plaza", plazaIds: ["p2"] }),
      crearProveedor({ id: "otra-categoria", especialidadesMantenimiento: ["CLIMA"] }),
    ];
    expect(proveedoresDeMantenimiento(padron, "PINTURA", "p1").map((p) => p.id)).toEqual([
      "ok",
    ]);
    expect(proveedoresDeMantenimiento(padron, "LIMPIEZA", "p1")).toEqual([]);
  });

  it("proveedoresDePartida excluye inactivos y a quien no trabaja la partida", () => {
    const padron = [
      crearProveedor({ id: "a", partidasObra: ["ACABADOS"] }),
      crearProveedor({ id: "b", partidasObra: ["ACABADOS"], activo: false }),
      crearProveedor({ id: "c", partidasObra: ["MUROS"] }),
    ];
    expect(proveedoresDePartida(padron, "ACABADOS").map((p) => p.id)).toEqual(["a"]);
  });
});

describe("altas", () => {
  it("siguienteIdProveedor continúa tras el mayor prv-N e ignora los de obra", () => {
    expect(
      siguienteIdProveedor([{ id: "prv-1" }, { id: "prv-8" }, { id: "prv-obra-18" }]),
    ).toBe("prv-9");
    expect(siguienteIdProveedor([])).toBe("prv-1");
  });

  it("rfcEnUso compara sin mayúsculas ni espacios y excluye al que se edita", () => {
    const padron = [crearProveedor({ id: "prv-1", rfc: "MCO180412K35" })];
    expect(rfcEnUso(padron, " mco180412k35 ")).toBe(true);
    expect(rfcEnUso(padron, "MCO180412K35", "prv-1")).toBe(false);
    expect(rfcEnUso(padron, "XYZ180412K35")).toBe(false);
  });
});
