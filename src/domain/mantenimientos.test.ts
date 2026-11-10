import { describe, expect, it } from "vitest";
import {
  cargoValido,
  consecutivoDeFolio,
  consumoPresupuesto,
  diasDeAtraso,
  disponiblePresupuesto,
  excedenteSobregiro,
  facturasDeMantenimiento,
  facturasSinLigar,
  erroresMantenimiento,
  estaAtrasado,
  estatusCompleto,
  filtrarPorUbicacion,
  inicioBloqueado,
  kpisMantenimiento,
  nivelPresupuesto,
  origenValido,
  proveedorAtiende,
  puedeTransicionar,
  requiereAutorizacion,
  resolverSobregiro,
  siguienteFolio,
  solicitarSobregiro,
  transicionar,
  uuidCorto,
} from "./mantenimientos";
import type { FacturaSat, Foto, Mantenimiento } from "./tipos";

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

describe("presupuesto", () => {
  const lista = [
    mnt({ id: "a", costoEstimado: 1000 }),
    mnt({ id: "b", costoEstimado: 2000, costoReal: 1500, estatus: "FINALIZADO" }),
    mnt({ id: "c", costoEstimado: 9000, estatus: "CANCELADO" }),
    mnt({ id: "d", plazaId: "plz-otra", costoEstimado: 7000 }),
    mnt({ id: "e", fechaProgramada: "2027-01-05", costoEstimado: 4000 }),
    mnt({
      id: "f",
      costoEstimado: 5000,
      autorizacionSobregiro: {
        estado: "PENDIENTE",
        solicitadoPor: "Ana",
        solicitadoEl: HOY,
        excedente: 100,
      },
    }),
  ];

  it("suma costo real o estimado de la plaza y el año, sin cancelados ni pendientes", () => {
    expect(consumoPresupuesto("plz-alborada", 2026, lista)).toBe(2500);
    expect(consumoPresupuesto("plz-alborada", 2027, lista)).toBe(4000);
    expect(consumoPresupuesto("plz-alborada", 2026, lista, "a")).toBe(1500);
  });

  it("cuenta lo autorizado y deja fuera lo rechazado", () => {
    const autorizada = mnt({
      costoEstimado: 300,
      autorizacionSobregiro: {
        estado: "AUTORIZADA",
        solicitadoPor: "Ana",
        solicitadoEl: HOY,
        excedente: 1,
      },
    });
    const rechazada = {
      ...autorizada,
      autorizacionSobregiro: {
        ...autorizada.autorizacionSobregiro!,
        estado: "RECHAZADA" as const,
      },
    };
    expect(consumoPresupuesto("plz-alborada", 2026, [autorizada])).toBe(300);
    expect(consumoPresupuesto("plz-alborada", 2026, [rechazada])).toBe(0);
  });

  it("el disponible puede quedar negativo", () => {
    expect(disponiblePresupuesto({ monto: 5000 }, 3000)).toBe(2000);
    expect(disponiblePresupuesto({ monto: 5000 }, 6000)).toBe(-1000);
  });

  it("alerta desde 80 % y sobregiro solo si se pasa", () => {
    const p = { monto: 1000 };
    expect(nivelPresupuesto(p, 799)).toBe("NORMAL");
    expect(nivelPresupuesto(p, 800)).toBe("ALERTA");
    expect(nivelPresupuesto(p, 1000)).toBe("ALERTA");
    expect(nivelPresupuesto(p, 1001)).toBe("SOBREGIRO");
  });

  it("requiere autorización solo si pasa del presupuesto", () => {
    const m = mnt({ costoEstimado: 400 });
    expect(requiereAutorizacion(m, { monto: 1000 }, 600)).toBe(false);
    expect(requiereAutorizacion(m, { monto: 1000 }, 601)).toBe(true);
    expect(requiereAutorizacion(m, undefined, 99999)).toBe(false);
    expect(excedenteSobregiro(m, { monto: 1000 }, 601)).toBe(1);
    expect(excedenteSobregiro(m, { monto: 1000 }, 100)).toBe(0);
  });
});

describe("sobregiro", () => {
  const pendiente = () =>
    solicitarSobregiro(mnt(), { solicitadoPor: "Ana", hoy: HOY, excedente: 250 });

  it("solicitar deja el trabajo pendiente con quién y cuándo", () => {
    expect(pendiente().autorizacionSobregiro).toEqual({
      estado: "PENDIENTE",
      solicitadoPor: "Ana",
      solicitadoEl: HOY,
      excedente: 250,
    });
  });

  it("no se puede iniciar mientras no esté autorizado", () => {
    const m = pendiente();
    expect(inicioBloqueado(m)).toBe(true);
    expect(transicionar(m, "EN_PROCESO", { hoy: HOY })).toBeUndefined();
    const rechazado = resolverSobregiro(m, "RECHAZADA", {
      resueltoPor: "Dir",
      hoy: HOY,
      comentario: "Sin presupuesto",
    })!;
    expect(transicionar(rechazado, "EN_PROCESO", { hoy: HOY })).toBeUndefined();
    expect(transicionar(rechazado, "CANCELADO", { hoy: HOY })?.estatus).toBe("CANCELADO");
    const autorizado = resolverSobregiro(m, "AUTORIZADA", {
      resueltoPor: "Dir",
      hoy: HOY,
    })!;
    expect(inicioBloqueado(autorizado)).toBe(false);
    expect(transicionar(autorizado, "EN_PROCESO", { hoy: HOY })?.estatus).toBe(
      "EN_PROCESO",
    );
  });

  it("rechazar exige comentario y autorizar lo acepta opcional", () => {
    const m = pendiente();
    expect(
      resolverSobregiro(m, "RECHAZADA", { resueltoPor: "Dir", hoy: HOY }),
    ).toBeUndefined();
    expect(
      resolverSobregiro(m, "RECHAZADA", {
        resueltoPor: "Dir",
        hoy: HOY,
        comentario: "  ",
      }),
    ).toBeUndefined();
    const ok = resolverSobregiro(m, "AUTORIZADA", {
      resueltoPor: "Dir",
      hoy: "2026-11-04",
      comentario: "Urgente",
    })!;
    expect(ok.autorizacionSobregiro).toMatchObject({
      estado: "AUTORIZADA",
      resueltoPor: "Dir",
      resueltoEl: "2026-11-04",
      comentario: "Urgente",
      solicitadoPor: "Ana",
    });
  });

  it("solo se resuelve lo pendiente", () => {
    const resuelto = resolverSobregiro(pendiente(), "AUTORIZADA", {
      resueltoPor: "Dir",
      hoy: HOY,
    })!;
    expect(
      resolverSobregiro(resuelto, "RECHAZADA", {
        resueltoPor: "Dir",
        hoy: HOY,
        comentario: "x",
      }),
    ).toBeUndefined();
    expect(
      resolverSobregiro(mnt(), "AUTORIZADA", { resueltoPor: "Dir", hoy: HOY }),
    ).toBeUndefined();
  });
});

describe("facturas SAT", () => {
  const factura = (parche: Partial<FacturaSat>): FacturaSat => ({
    id: "fsat-1",
    uuid: "A1B2C3D4-0000-4000-8000-0123456789AB",
    rfcEmisor: "AAA010101AAA",
    emisor: "Proveedor",
    fecha: HOY,
    subtotal: 100,
    iva: 16,
    total: 116,
    concepto: "x",
    plazaId: "plz-alborada",
    ...parche,
  });
  const facturas = [
    factura({ id: "1" }),
    factura({ id: "2", mantenimientoId: "mnt-0001" }),
    factura({ id: "3", plazaId: "plz-otra" }),
  ];

  it("la bandeja solo trae las libres de la plaza", () => {
    expect(facturasSinLigar(facturas, "plz-alborada").map((f) => f.id)).toEqual(["1"]);
  });
  it("lista las ligadas a un mantenimiento", () => {
    expect(facturasDeMantenimiento(facturas, "mnt-0001").map((f) => f.id)).toEqual(["2"]);
  });
  it("abrevia el UUID", () => {
    expect(uuidCorto("a1b2c3d4-0000-4000-8000-0123456789ab")).toBe("A1B2C3D4");
  });
});
