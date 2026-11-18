import { describe, expect, it } from "vitest";
import { PERMISOS, type Accion } from "@/config/permissions";
import type { Rol } from "@/domain";
import { ACCIONES_MATRIZ, matrizPermisos } from "./calculos";

const ROLES = Object.keys(PERMISOS) as Rol[];

describe("matrizPermisos", () => {
  const filas = matrizPermisos(ROLES);

  it("cubre cada acción que algún rol puede ejecutar, sin repetir", () => {
    const enMatriz = filas.map((f) => f.accion).sort();
    const enPermisos = [...new Set(ROLES.flatMap((r) => PERMISOS[r]))].sort();
    expect(enMatriz).toEqual(enPermisos);
    expect(new Set(enMatriz).size).toBe(enMatriz.length);
  });

  it("refleja exactamente PERMISOS para cada rol", () => {
    for (const fila of filas)
      for (const rol of ROLES)
        expect(fila.permitido[rol]).toBe(PERMISOS[rol].includes(fila.accion));
  });

  it("Dirección autoriza excepciones y sobregiros, ve al equipo comercial, la cobranza y la obra; Superadmin las tiene todas", () => {
    expect(filas.filter((f) => f.permitido.DIRECCION).map((f) => f.accion)).toEqual([
      "comercial.verEquipo",
      "campanas.gestionar",
      "casos.gestionar",
      "comisiones.pagar",
      "comisiones.esquemaEditar",
      "excepcion.autorizar",
      "cobranza.ver",
      "mantenimiento.sobregiroAutorizar",
      "terrenos.ver",
    ]);
    expect(filas.every((f) => f.permitido.SUPERADMIN)).toBe(true);
  });

  it("el Contratista solo responde licitaciones, en el módulo de obra junto a gestionarlas", () => {
    expect(filas.filter((f) => f.permitido.CONTRATISTA).map((f) => f.accion)).toEqual([
      "licitacion.responder",
    ]);
    const obra = ACCIONES_MATRIZ.find((m) => m.modulo === "Obra y licitación")!;
    const ids = obra.acciones.map((a) => a.accion);
    expect(ids[ids.indexOf("licitacion.gestionar") + 1]).toBe("licitacion.responder");
  });

  it("Servicio a clientes va justo después de Contratos y lo gestionan Atención a clientes y Dirección", () => {
    const modulos = ACCIONES_MATRIZ.map((m) => m.modulo);
    expect(modulos[modulos.indexOf("Contratos") + 1]).toBe("Servicio a clientes");
    expect(
      filas.filter((f) => f.permitido.ATENCION_CLIENTES).map((f) => f.accion),
    ).toEqual(["casos.gestionar"]);
  });

  it("Comisiones va tras Servicio a clientes y sus acciones son de Dirección y Superadmin", () => {
    const modulos = ACCIONES_MATRIZ.map((m) => m.modulo);
    expect(modulos[modulos.indexOf("Servicio a clientes") + 1]).toBe("Comisiones");
    const comisiones = ACCIONES_MATRIZ.find((m) => m.modulo === "Comisiones")!;
    expect(comisiones.acciones.map((a) => a.accion)).toEqual([
      "comisiones.pagar",
      "comisiones.esquemaEditar",
    ]);
    for (const accion of ["comisiones.pagar", "comisiones.esquemaEditar"]) {
      const fila = filas.find((f) => f.accion === accion)!;
      expect(ROLES.filter((rol) => fila.permitido[rol]).sort()).toEqual([
        "DIRECCION",
        "SUPERADMIN",
      ]);
    }
  });

  it("agrupa por módulo en el orden del catálogo", () => {
    const total = ACCIONES_MATRIZ.reduce((n, g) => n + g.acciones.length, 0);
    expect(filas).toHaveLength(total);
    expect(filas[0].accion satisfies Accion).toBe(ACCIONES_MATRIZ[0].acciones[0].accion);
  });
});
