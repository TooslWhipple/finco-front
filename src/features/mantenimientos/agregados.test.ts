import { describe, expect, it } from "vitest";
import type { Mantenimiento } from "@/domain";
import {
  FILTRO_INICIAL,
  TODOS,
  filtrarMantenimientos,
  mantenimientosDeEstatus,
} from "./agregados";

function mnt(parche: Partial<Mantenimiento>): Mantenimiento {
  return {
    id: "x",
    folio: "MNT-2026-0001",
    plazaId: "p1",
    titulo: "Pintura de pasillos",
    descripcion: "",
    tipo: "PREVENTIVO",
    categoria: "PINTURA",
    origen: "ADMINISTRACION",
    estatus: "PROGRAMADO",
    proveedorId: "prv-1",
    fechaProgramada: "2026-11-10",
    costoEstimado: 1,
    cargoA: "PLAZA",
    evidencia: [],
    ...parche,
  };
}

const lista = [
  mnt({ id: "a", plazaId: "p1" }),
  mnt({
    id: "b",
    plazaId: "p2",
    tipo: "CORRECTIVO",
    origen: "LOCATARIO",
    cargoA: "LOCATARIO",
    titulo: "Fuga",
  }),
  mnt({ id: "c", plazaId: "p2", folio: "MNT-2026-0099" }),
];
const buscable = (m: Mantenimiento) => `${m.folio} ${m.titulo}`;

describe("filtrarMantenimientos", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarMantenimientos(lista, FILTRO_INICIAL, buscable)).toHaveLength(3);
  });

  it("combina plaza, tipo y cargo", () => {
    const ids = (f: Partial<typeof FILTRO_INICIAL>) =>
      filtrarMantenimientos(lista, { ...FILTRO_INICIAL, ...f }, buscable).map(
        (m) => m.id,
      );
    expect(ids({ plazaId: "p2" })).toEqual(["b", "c"]);
    expect(ids({ tipo: "CORRECTIVO" })).toEqual(["b"]);
    expect(ids({ cargo: "LOCATARIO", plazaId: "p1" })).toEqual([]);
    expect(ids({ plazaId: TODOS, cargo: "PLAZA" })).toEqual(["a", "c"]);
  });

  it("busca sin distinguir mayúsculas ni acentos", () => {
    const ids = (texto: string) =>
      filtrarMantenimientos(lista, { ...FILTRO_INICIAL, texto }, buscable).map(
        (m) => m.id,
      );
    expect(ids("FUGA")).toEqual(["b"]);
    expect(ids("0099")).toEqual(["c"]);
    expect(ids("  ")).toHaveLength(3);
    expect(ids("pintúra")).toEqual(["a", "c"]);
  });
});

describe("mantenimientosDeEstatus", () => {
  it("abiertos por fecha programada ascendente; cerrados del más reciente al más antiguo", () => {
    const l = [
      mnt({ id: "1", fechaProgramada: "2026-11-20" }),
      mnt({ id: "2", fechaProgramada: "2026-10-01" }),
      mnt({
        id: "3",
        estatus: "FINALIZADO",
        fechaFin: "2026-09-01",
        fechaInicio: "2026-09-01",
        costoReal: 1,
      }),
      mnt({
        id: "4",
        estatus: "FINALIZADO",
        fechaFin: "2026-10-01",
        fechaInicio: "2026-10-01",
        costoReal: 1,
      }),
    ];
    expect(mantenimientosDeEstatus(l, "PROGRAMADO").map((m) => m.id)).toEqual(["2", "1"]);
    expect(mantenimientosDeEstatus(l, "FINALIZADO").map((m) => m.id)).toEqual(["4", "3"]);
    expect(mantenimientosDeEstatus(l, "CANCELADO")).toEqual([]);
  });
});
