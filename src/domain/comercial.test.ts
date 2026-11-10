import { describe, expect, it } from "vitest";
import { filtrarPorVendedor } from "./comercial";
import type { Rol, Usuario } from "./tipos";

const usuario = (id: string, rol: Rol): Usuario => ({ id, nombre: id, rol, cargo: "" });
const items = [
  { id: 1, vendedorId: "usr-sofia" },
  { id: 2, vendedorId: "usr-luis" },
  { id: 3, vendedorId: "usr-sofia" },
];

describe("filtrarPorVendedor", () => {
  it("un vendedor solo ve lo suyo", () => {
    expect(
      filtrarPorVendedor(items, usuario("usr-sofia", "VENTAS")).map((i) => i.id),
    ).toEqual([1, 3]);
    expect(
      filtrarPorVendedor(items, usuario("usr-luis", "VENTAS")).map((i) => i.id),
    ).toEqual([2]);
  });

  it("quien ve al equipo conserva todo", () => {
    for (const rol of ["GERENTE_COMERCIAL", "DIRECCION", "SUPERADMIN", "PMO"] as const)
      expect(filtrarPorVendedor(items, usuario("otro", rol))).toHaveLength(3);
  });

  it("los demás roles no ven nada ajeno", () => {
    expect(filtrarPorVendedor(items, usuario("usr-patricia", "COBRANZA"))).toEqual([]);
  });
});
