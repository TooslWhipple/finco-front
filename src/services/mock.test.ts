import { describe, expect, it } from "vitest";
import { DEMO_TODAY } from "@/domain";
import { crearSeed } from "@/data/seed";
import { crearRepositoriosMock } from "./mock";

const seed = crearSeed();
const repos = crearRepositoriosMock(seed);

describe("repositorios mock", () => {
  it("plazas: lista 39, obtiene una por id y sus plantas", async () => {
    expect(await repos.plazas.listarPlazas()).toHaveLength(39);
    expect(await repos.plazas.listarCiudades()).toHaveLength(11);
    const plaza = await repos.plazas.obtenerPlaza("plz-alborada");
    expect(plaza?.nombre).toBe("Plaza Alborada");
    expect(await repos.plazas.listarPlantas("plz-alborada")).toHaveLength(2);
    expect(await repos.plazas.obtenerPlaza("no-existe")).toBeUndefined();
  });

  it("locales: filtra por plaza y resuelve el contrato vigente", async () => {
    expect(await repos.locales.listar()).toHaveLength(946);
    expect(await repos.locales.listarPorPlaza("plz-alborada")).toHaveLength(58);
    const contrato = await repos.locales.contratoVigenteDe("plz-alborada-B-02");
    expect(contrato?.rentaMensual).toBe(21_300);
    expect(await repos.locales.contratoVigenteDe("plz-alborada-A-09")).toBeUndefined();
    expect(await repos.locales.listarCambiosPropuestos(2027)).toHaveLength(8);
    expect(await repos.locales.listarCambiosPropuestos(2030)).toHaveLength(0);
  });

  it("cotizaciones: encuentra COT-2026-0418 y entrega un folio libre", async () => {
    const cot = await repos.cotizaciones.obtener("COT-2026-0418");
    expect(cot?.rentaMensual).toBe(22_900);
    expect(await repos.cotizaciones.listarPorLocal("plz-alborada-A-09")).toHaveLength(1);
    const folio = await repos.cotizaciones.siguienteFolio();
    expect(await repos.cotizaciones.obtener(folio)).toBeUndefined();
    expect(folio).toBe("COT-2026-0419");
  });

  it("cobranza: el corte de noviembre incluye toda la cartera", async () => {
    const corte = await repos.cobranza.listarCorte("2026-11");
    expect(corte).toHaveLength((await repos.locales.listarContratos()).length);
    expect(await repos.cobranza.listarCorte("2026-12")).toHaveLength(0);
  });

  it("integraciones: estado calculado y sincronización", async () => {
    const estado = await repos.integraciones.obtenerEstado();
    expect(estado.diferencias).toHaveLength(3);
    expect(estado.conciliacion).toBeGreaterThan(0.95);
    const nuevo = await repos.integraciones.sincronizar(`${DEMO_TODAY}T15:50:00`);
    expect(nuevo.ultimoSync).toBe(`${DEMO_TODAY}T15:50:00`);
  });

  it("integraciones: lista las 3 con su log inicial", async () => {
    const lista = await repos.integraciones.listar();
    expect(lista.map((i) => i.id)).toEqual(["ENKONTROL", "EXCEL", "MONDAY"]);
    const eventos = await repos.integraciones.listarEventos();
    expect(eventos.length).toBeGreaterThan(0);
    expect(new Set(lista.map((i) => i.id))).toEqual(
      new Set(eventos.map((e) => e.integracionId)),
    );
  });

  it("prospectos, contratos y terrenos: leen el seed", async () => {
    expect(await repos.prospectos.listar()).toHaveLength(seed.prospectos.length);
    expect(await repos.terrenos.listar()).toHaveLength(seed.terrenos.length);
    const contratos = await repos.contratos.listar();
    expect(contratos).toEqual(await repos.locales.listarContratos());
    expect(contratos.every((c) => c.estado === "VIGENTE")).toBe(true);
  });

  it("configuración: usuarios, reglas por plaza y parámetros del dominio", async () => {
    expect(await repos.configuracion.listarUsuarios()).toHaveLength(4);
    const reglas = await repos.configuracion.reglasDefault();
    expect(reglas["plz-alborada"]).toBeDefined();
    const parametros = await repos.configuracion.obtenerParametros();
    expect(parametros.horasApartado).toBe(72);
    expect(parametros.umbralOcupacionAlta).toBe(0.9);
    expect(parametros.umbralOcupacionMedia).toBe(0.75);
    expect(Object.keys(parametros.inpcAnual).length).toBeGreaterThan(0);
  });

  it("mantenimientos: lista el seed y sus proveedores", async () => {
    expect(await repos.mantenimientos.listar()).toEqual(seed.mantenimientos);
    expect(await repos.mantenimientos.listarProveedores()).toHaveLength(8);
  });
});
