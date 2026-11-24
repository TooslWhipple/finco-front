import { describe, expect, it } from "vitest";
import type { Rol } from "@/domain";
import {
  hrefPermitido,
  INICIO_POR_ROL,
  REGLAS_RUTA,
  RUTA_SIN_ACCESO,
  rutaPermitida,
  rutaTieneDueno,
  RUTAS_PUBLICAS,
} from "./acceso-rutas";
import { NAVEGACION } from "./navigation";

const ROLES = Object.keys(INICIO_POR_ROL) as Rol[];

describe("reglas de ruta", () => {
  it("el Gerente comercial abre lo comercial y nada de cobranza, obra, mantenimiento ni configuración", () => {
    for (const ruta of [
      "/",
      "/resumen-comercial",
      "/cotizaciones/x",
      "/plazas/a/locales/b",
    ]) {
      expect(rutaPermitida("GERENTE_COMERCIAL", ruta), ruta).toBe(true);
    }
    for (const ruta of [
      "/cobranza",
      "/terrenos-y-proyectos",
      "/configuracion",
      "/mantenimientos",
    ]) {
      expect(rutaPermitida("GERENTE_COMERCIAL", ruta), ruta).toBe(false);
    }
  });

  it("Campañas la abre el Gerente comercial y no Ventas", () => {
    expect(rutaPermitida("GERENTE_COMERCIAL", "/campanas")).toBe(true);
    expect(rutaPermitida("VENTAS", "/campanas")).toBe(false);
  });

  it("Servicio a clientes la abren Atención a clientes, Gerente comercial y PMO; Atención a clientes ubica al locatario en Plazas y Contratos", () => {
    for (const rol of [
      "ATENCION_CLIENTES",
      "GERENTE_COMERCIAL",
      "PMO",
      "DIRECCION",
      "SUPERADMIN",
    ] as const) {
      expect(rutaPermitida(rol, "/servicio-clientes"), rol).toBe(true);
    }
    for (const rol of ["VENTAS", "COBRANZA", "SUPERVISOR_OBRA", "CONTRATISTA"] as const) {
      expect(rutaPermitida(rol, "/servicio-clientes"), rol).toBe(false);
    }
    for (const ruta of ["/plazas/plz-alborada", "/contratos"]) {
      expect(rutaPermitida("ATENCION_CLIENTES", ruta), ruta).toBe(true);
    }
    for (const ruta of ["/cobranza", "/mantenimientos", "/prospectos"]) {
      expect(rutaPermitida("ATENCION_CLIENTES", ruta), ruta).toBe(false);
    }
  });

  it("Comisiones la abren Ventas, Gerente comercial, Dirección y Superadmin", () => {
    for (const rol of ["VENTAS", "GERENTE_COMERCIAL", "DIRECCION", "SUPERADMIN"] as const) {
      expect(rutaPermitida(rol, "/comisiones"), rol).toBe(true);
    }
    for (const rol of [
      "COBRANZA",
      "PMO",
      "SUPERVISOR_OBRA",
      "CONTRATISTA",
      "ATENCION_CLIENTES",
    ] as const) {
      expect(rutaPermitida(rol, "/comisiones"), rol).toBe(false);
    }
    expect(rutaTieneDueno("/comisiones")).toBe(true);
  });

  it("una ruta que no es de ningún módulo no tiene dueño; las del portal sí", () => {
    expect(rutaTieneDueno("/ruta-inventada")).toBe(false);
    expect(rutaTieneDueno("/login")).toBe(false);
    expect(rutaTieneDueno("/contratos/x/imprimir")).toBe(true);
    expect(rutaTieneDueno("/")).toBe(true);
    expect(RUTAS_PUBLICAS).toEqual([RUTA_SIN_ACCESO]);
  });

  it("los ids del menú y las claves de REGLAS_RUTA coinciden", () => {
    const ids = NAVEGACION.flatMap((g) => g.items.map((i) => i.id));
    expect([...ids].sort()).toEqual(Object.keys(REGLAS_RUTA).sort());
    for (const item of NAVEGACION.flatMap((g) => g.items)) {
      const regla = REGLAS_RUTA[item.id];
      expect(item.ruta, item.id).toBe(regla.ruta);
      expect(item.prefijo, item.id).toBe(regla.prefijo);
      expect(item.roles, item.id).toEqual(regla.roles);
    }
  });

  it("el inicio de cada rol es una ruta con dueño que el rol puede abrir", () => {
    for (const rol of ROLES) {
      const inicio = INICIO_POR_ROL[rol];
      expect(rutaPermitida(rol, inicio), rol).toBe(true);
      expect(rutaTieneDueno(inicio), rol).toBe(true);
    }
  });

  it("hrefPermitido ignora la query y el hash", () => {
    expect(hrefPermitido("GERENTE_COMERCIAL", "/terrenos-y-proyectos?terreno=x")).toBe(
      false,
    );
    expect(hrefPermitido("GERENTE_COMERCIAL", "/plazas/a#locales")).toBe(true);
    expect(hrefPermitido("DIRECCION", "/terrenos-y-proyectos?terreno=x")).toBe(true);
  });
});
