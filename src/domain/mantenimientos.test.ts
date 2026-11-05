import { describe, expect, it } from "vitest";
import {
  cargoValido,
  consecutivoDeFolio,
  diasDeAtraso,
  erroresMantenimiento,
  estaAtrasado,
  estatusCompleto,
  filtrarPorUbicacion,
  kpisMantenimiento,
  origenValido,
  proveedorAtiende,
  puedeTransicionar,
  siguienteFolio,
  transicionar,
} from "./mantenimientos";
import type { Foto, Mantenimiento } from "./tipos";

const HOY = "2026-11-03";

const FOTO: Foto = {
  src: "/mantenimientos/pintura/01.webp",
  alt: "x",
  ancho: 1,
  alto: 1,
};
const FOTO_2: Foto = { ...FOTO, src: "/mantenimientos/pintura/02.webp" };

function mnt(parche: Partial<Mantenimiento> = {}): Mantenimiento {
  return {
    id: "mnt-0001",
    folio: "MNT-2026-0001",
    plazaId: "plz-alborada",
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

describe("invariantes", () => {
  it("un preventivo solo viene de la administración", () => {
    expect(origenValido({ tipo: "PREVENTIVO", origen: "ADMINISTRACION" })).toBe(true);
    expect(origenValido({ tipo: "PREVENTIVO", origen: "LOCATARIO" })).toBe(false);
    expect(origenValido({ tipo: "CORRECTIVO", origen: "LOCATARIO" })).toBe(true);
  });

  it("cobrar al locatario exige local concreto y ocupado", () => {
    const ocupado = { id: "l1", estatus: "OCUPADO" as const };
    expect(cargoValido({ cargoA: "PLAZA", localId: undefined }, undefined)).toBe(true);
    expect(cargoValido({ cargoA: "LOCATARIO", localId: "l1" }, ocupado)).toBe(true);
    expect(cargoValido({ cargoA: "LOCATARIO", localId: undefined }, ocupado)).toBe(false);
    expect(
      cargoValido(
        { cargoA: "LOCATARIO", localId: "l1" },
        { id: "l1", estatus: "DISPONIBLE" },
      ),
    ).toBe(false);
    expect(cargoValido({ cargoA: "LOCATARIO", localId: "l1" }, undefined)).toBe(false);
    expect(cargoValido({ cargoA: "LOCATARIO", localId: "l2" }, ocupado)).toBe(false);
  });

  it("EN_PROCESO necesita inicio", () => {
    expect(estatusCompleto(mnt({ estatus: "EN_PROCESO" }))).toBe(false);
    expect(estatusCompleto(mnt({ estatus: "EN_PROCESO", fechaInicio: HOY }))).toBe(true);
  });

  it("FINALIZADO necesita inicio, fin >= inicio y costo real", () => {
    const base = {
      estatus: "FINALIZADO" as const,
      fechaInicio: "2026-10-01",
      fechaFin: "2026-10-01",
      costoReal: 0,
    };
    expect(estatusCompleto(mnt(base))).toBe(true);
    expect(estatusCompleto(mnt({ ...base, fechaInicio: undefined }))).toBe(false);
    expect(estatusCompleto(mnt({ ...base, fechaFin: undefined }))).toBe(false);
    expect(estatusCompleto(mnt({ ...base, fechaFin: "2026-09-30" }))).toBe(false);
    expect(estatusCompleto(mnt({ ...base, costoReal: undefined }))).toBe(false);
  });

  it("PROGRAMADO y CANCELADO no exigen fechas", () => {
    expect(estatusCompleto(mnt())).toBe(true);
    expect(estatusCompleto(mnt({ estatus: "CANCELADO" }))).toBe(true);
  });

  it("el proveedor debe atender la categoría", () => {
    const p = { especialidades: ["PINTURA" as const] };
    expect(proveedorAtiende(p, "PINTURA")).toBe(true);
    expect(proveedorAtiende(p, "CLIMA")).toBe(false);
    expect(proveedorAtiende(undefined, "PINTURA")).toBe(false);
  });

  it("erroresMantenimiento junta los incumplimientos", () => {
    const ok = erroresMantenimiento(mnt(), {
      proveedor: { especialidades: ["PINTURA"] },
    });
    expect(ok).toEqual([]);
    const mal = erroresMantenimiento(
      mnt({
        tipo: "PREVENTIVO",
        origen: "LOCATARIO",
        cargoA: "LOCATARIO",
        estatus: "EN_PROCESO",
      }),
      { proveedor: { especialidades: ["CLIMA"] } },
    );
    expect(mal).toHaveLength(4);
  });
});

describe("transiciones", () => {
  it("solo las permitidas por el flujo", () => {
    expect(puedeTransicionar("PROGRAMADO", "EN_PROCESO")).toBe(true);
    expect(puedeTransicionar("PROGRAMADO", "CANCELADO")).toBe(true);
    expect(puedeTransicionar("PROGRAMADO", "FINALIZADO")).toBe(false);
    expect(puedeTransicionar("EN_PROCESO", "FINALIZADO")).toBe(true);
    expect(puedeTransicionar("EN_PROCESO", "CANCELADO")).toBe(true);
    expect(puedeTransicionar("EN_PROCESO", "PROGRAMADO")).toBe(false);
    for (const destino of [
      "PROGRAMADO",
      "EN_PROCESO",
      "FINALIZADO",
      "CANCELADO",
    ] as const) {
      expect(puedeTransicionar("FINALIZADO", destino)).toBe(false);
      expect(puedeTransicionar("CANCELADO", destino)).toBe(false);
    }
  });

  it("iniciar fija la fecha de inicio y agrega la evidencia", () => {
    const m = transicionar(mnt({ evidencia: [FOTO] }), "EN_PROCESO", {
      hoy: HOY,
      evidencia: [FOTO_2],
    });
    expect(m).toMatchObject({ estatus: "EN_PROCESO", fechaInicio: HOY });
    expect(m?.evidencia).toEqual([FOTO, FOTO_2]);
  });

  it("finalizar pide costo real y fija el fin", () => {
    const enProceso = mnt({ estatus: "EN_PROCESO", fechaInicio: "2026-10-30" });
    expect(transicionar(enProceso, "FINALIZADO", { hoy: HOY })).toBeUndefined();
    expect(
      transicionar(enProceso, "FINALIZADO", { hoy: HOY, costoReal: -1 }),
    ).toBeUndefined();
    expect(
      transicionar(enProceso, "FINALIZADO", { hoy: HOY, costoReal: NaN }),
    ).toBeUndefined();
    const fin = transicionar(enProceso, "FINALIZADO", {
      hoy: HOY,
      costoReal: 900,
      evidencia: [FOTO],
    });
    expect(fin).toMatchObject({
      estatus: "FINALIZADO",
      fechaInicio: "2026-10-30",
      fechaFin: HOY,
      costoReal: 900,
    });
    expect(fin?.evidencia).toEqual([FOTO]);
    expect(
      erroresMantenimiento(fin!, { proveedor: { especialidades: ["PINTURA"] } }),
    ).toEqual([]);
  });

  it("no finaliza antes de la fecha de inicio", () => {
    const futuro = mnt({ estatus: "EN_PROCESO", fechaInicio: "2026-12-01" });
    expect(
      transicionar(futuro, "FINALIZADO", { hoy: HOY, costoReal: 1 }),
    ).toBeUndefined();
  });

  it("cancelar no toca fechas ni evidencia", () => {
    const m = mnt({ evidencia: [FOTO] });
    expect(transicionar(m, "CANCELADO", { hoy: HOY, evidencia: [FOTO_2] })).toEqual({
      ...m,
      estatus: "CANCELADO",
    });
  });

  it("una transición no permitida devuelve undefined y no muta", () => {
    const m = mnt({ estatus: "FINALIZADO" });
    expect(transicionar(m, "EN_PROCESO", { hoy: HOY })).toBeUndefined();
    expect(m.estatus).toBe("FINALIZADO");
  });
});

describe("atraso", () => {
  it("solo un programado con fecha anterior a hoy", () => {
    expect(estaAtrasado(mnt({ fechaProgramada: "2026-11-02" }), HOY)).toBe(true);
    expect(estaAtrasado(mnt({ fechaProgramada: HOY }), HOY)).toBe(false);
    expect(
      estaAtrasado(mnt({ fechaProgramada: "2026-10-01", estatus: "EN_PROCESO" }), HOY),
    ).toBe(false);
    expect(diasDeAtraso(mnt({ fechaProgramada: "2026-10-30" }), HOY)).toBe(4);
    expect(diasDeAtraso(mnt({ fechaProgramada: "2026-11-30" }), HOY)).toBe(0);
  });
});

describe("kpisMantenimiento", () => {
  it("se calculan desde los datos", () => {
    const lista = [
      mnt({ id: "1", estatus: "PROGRAMADO", fechaProgramada: "2026-10-01" }),
      mnt({ id: "2", estatus: "EN_PROCESO", tipo: "CORRECTIVO", origen: "LOCATARIO" }),
      mnt({
        id: "3",
        estatus: "FINALIZADO",
        fechaInicio: "2026-11-01",
        fechaFin: "2026-11-02",
        costoReal: 1500,
      }),
      mnt({
        id: "4",
        estatus: "FINALIZADO",
        fechaInicio: "2026-11-01",
        fechaFin: "2026-11-02",
        costoReal: 700,
        cargoA: "LOCATARIO",
      }),
      mnt({
        id: "5",
        estatus: "FINALIZADO",
        fechaInicio: "2026-10-01",
        fechaFin: "2026-10-02",
        costoReal: 9000,
      }),
      mnt({ id: "6", estatus: "CANCELADO", tipo: "CORRECTIVO" }),
    ];
    expect(kpisMantenimiento(lista, HOY)).toEqual({
      abiertos: 2,
      atrasados: 1,
      gastoMes: 1500,
      pctPreventivo: 4 / 5,
    });
  });

  it("sin registros no divide entre cero", () => {
    expect(kpisMantenimiento([], HOY)).toEqual({
      abiertos: 0,
      atrasados: 0,
      gastoMes: 0,
      pctPreventivo: 0,
    });
  });
});

describe("folios", () => {
  it("el siguiente va después del máximo existente, con el año de hoy", () => {
    expect(siguienteFolio([], HOY)).toBe("MNT-2026-0001");
    expect(siguienteFolio(["MNT-2026-0003", "MNT-2026-0012", "MNT-2026-0007"], HOY)).toBe(
      "MNT-2026-0013",
    );
    expect(siguienteFolio(["MNT-2025-0200"], HOY)).toBe("MNT-2026-0201");
  });

  it("ignora folios con otra forma", () => {
    expect(consecutivoDeFolio("COT-2026-0418")).toBeUndefined();
    expect(siguienteFolio(["COT-2026-0418"], HOY)).toBe("MNT-2026-0001");
  });
});

describe("filtrarPorUbicacion", () => {
  const lista = [
    mnt({ id: "a", plazaId: "p1" }),
    mnt({ id: "b", plazaId: "p1", localId: "l1" }),
    mnt({ id: "c", plazaId: "p2", localId: "l2" }),
  ];
  it("filtra por plaza, por local o sin filtro", () => {
    expect(filtrarPorUbicacion(lista, {}).map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(filtrarPorUbicacion(lista, { plazaId: "p1" }).map((m) => m.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filtrarPorUbicacion(lista, { localId: "l2" }).map((m) => m.id)).toEqual(["c"]);
  });
});
