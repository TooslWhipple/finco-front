import { describe, expect, it } from "vitest";
import {
  DEMO_TODAY,
  localesSinAbrir,
  sobregirosPendientes,
  solicitarSobregiro,
  type EtapaProspecto,
} from "@/domain";
import { crearSeed } from "@/data/seed";
import { crearProspecto } from "@/domain/fixtures";
import { kpisCobranza } from "@/features/cobranza/calculos";
import { kpisMapa, resumirPlazasMapa } from "@/features/mapa/agregados";
import {
  cumplimientoGlobal,
  reporteCumplimientoPlan,
} from "@/features/reportes/calculos-rentas";
import type { DatosReporte } from "@/features/reportes/tipos";
import { MES_DEMO } from "@/lib/tiempo";
import { avanceEquipo, resumenComercial } from "./agregados";

const seed = crearSeed();
const datos: DatosReporte = {
  ciudades: seed.ciudades,
  plazas: seed.plazas,
  locales: seed.locales,
  contratos: seed.contratos,
  facturas: seed.facturas,
  prospectos: seed.prospectos,
  terrenos: seed.terrenos,
  fuentesLocatario: {
    locatarios: seed.locatarios,
    prospectos: seed.prospectos,
    cotizaciones: seed.cotizaciones,
  },
  cotizaciones: seed.cotizaciones,
  excepciones: seed.excepciones,
  campanas: seed.campanas,
  atribucionContratos: seed.atribucionContratos,
  hoy: DEMO_TODAY,
};

describe("resumenComercial", () => {
  const r = resumenComercial(datos, seed.mantenimientos);

  it("plazas y ocupación salen de kpisMapa (solo en operación)", () => {
    const mapa = kpisMapa(resumirPlazasMapa(datos.ciudades, datos.plazas, datos.locales));
    expect(r.plazas).toBe(mapa.plazas - mapa.enPreventa);
    expect(r.enPreventa).toBe(mapa.enPreventa);
    expect(r.plazas).toBe(
      datos.plazas.filter((p) => p.estatus === "EN_OPERACION").length,
    );
    expect(r.ocupacion).toBe(mapa.ocupacionPromedio);
  });

  it("el cumplimiento es Σ contratada / Σ planeada del reporte de cumplimiento", () => {
    const filas = reporteCumplimientoPlan(datos).tabla.filas;
    const planeada = filas.reduce((s, f) => s + Number(f.planeada), 0);
    const contratada = filas.reduce((s, f) => s + Number(f.contratada), 0);
    expect(planeada).toBeGreaterThan(0);
    expect(r.cumplimiento).toBeCloseTo(contratada / planeada, 10);
    expect(r.cumplimiento).toBe(cumplimientoGlobal(datos));
  });

  it("locales sin abrir, cartera vencida y sobregiros usan las funciones del detalle", () => {
    expect(r.localesSinAbrir).toBe(
      localesSinAbrir(datos.locales, datos.contratos, datos.hoy).length,
    );
    expect(r.carteraVencida).toBe(
      kpisCobranza([...datos.facturas], MES_DEMO, datos.hoy).carteraVencida,
    );
    expect(r.sobregirosPendientes).toBe(sobregirosPendientes(seed.mantenimientos).length);
  });

  it("cuenta un sobregiro nuevo en cuanto queda pendiente", () => {
    const libre = seed.mantenimientos.find((m) => m.autorizacionSobregiro === undefined)!;
    const pendiente = solicitarSobregiro(libre, {
      solicitadoPor: "Ana",
      hoy: DEMO_TODAY,
      excedente: 100,
    });
    const otros = seed.mantenimientos.filter((m) => m.id !== libre.id);
    expect(resumenComercial(datos, [pendiente, ...otros]).sobregirosPendientes).toBe(
      sobregirosPendientes(otros).length + 1,
    );
  });
});

describe("cumplimientoGlobal", () => {
  it("es 0 sin plazas en operación con plan", () => {
    expect(cumplimientoGlobal({ ...datos, plazas: [] })).toBe(0);
  });
});

describe("avanceEquipo", () => {
  const hoy = "2026-11-03";
  const conUltimoHecho = (
    id: string,
    vendedorId: string,
    etapa: EtapaProspecto,
    fecha: string,
  ) =>
    crearProspecto({
      id,
      vendedorId,
      etapa,
      creadoEl: "2026-08-01",
      actividad: [{ id: "a", titulo: "x", fecha }],
    });

  it("cuenta Negociación y los fríos del vendedor dueño", () => {
    const filas = avanceEquipo(
      [
        conUltimoHecho("1", "usr-luis", "NEGOCIACION", "2026-11-01"),
        conUltimoHecho("2", "usr-luis", "CONTACTADO", "2026-09-01"),
        conUltimoHecho("3", "usr-sofia", "NEGOCIACION", "2026-11-01"),
      ],
      hoy,
    );
    const luis = filas.find((f) => f.usuarioId === "usr-luis")!;
    const negociacion = (f: typeof luis) =>
      f.porEtapa.find((p) => p.etapa === "NEGOCIACION")!.cantidad;
    expect(negociacion(luis)).toBe(1);
    expect(luis.frios).toBe(1);
    expect(luis.porEtapa.map((p) => p.etapa)).not.toContain("GANADO");
    expect(luis.porEtapa.map((p) => p.etapa)).not.toContain("PERDIDO");
    expect(negociacion(filas.find((f) => f.usuarioId === "usr-jorge")!)).toBe(0);
  });

  it("ganados30d solo cuenta los ganados de los últimos 30 días", () => {
    const [sofia] = avanceEquipo(
      [
        conUltimoHecho("1", "usr-sofia", "GANADO", "2026-10-20"),
        conUltimoHecho("2", "usr-sofia", "GANADO", "2026-10-05"),
        conUltimoHecho("3", "usr-sofia", "GANADO", "2026-09-15"),
      ],
      hoy,
    );
    expect(sofia.usuarioId).toBe("usr-sofia");
    expect(sofia.ganados30d).toBe(2);
  });

  it("los prospectos de un usuario fuera del equipo caen en Otros, al final", () => {
    const filas = avanceEquipo(
      [
        conUltimoHecho("1", "usr-rasek", "NUEVO", "2026-11-01"),
        conUltimoHecho("2", "usr-sofia", "NUEVO", "2026-11-01"),
      ],
      hoy,
    );
    expect(filas.map((f) => f.usuarioId)).toEqual([
      "usr-sofia",
      "usr-luis",
      "usr-jorge",
      null,
    ]);
    expect(filas.at(-1)!.porEtapa.find((p) => p.etapa === "NUEVO")!.cantidad).toBe(1);
    expect(
      avanceEquipo([conUltimoHecho("2", "usr-sofia", "NUEVO", hoy)], hoy),
    ).toHaveLength(3);
  });

  it("con el seed fija el avance de cada vendedor", () => {
    const filas = avanceEquipo(seed.prospectos, DEMO_TODAY).map((f) => ({
      usuarioId: f.usuarioId,
      porEtapa: Object.fromEntries(f.porEtapa.map((p) => [p.etapa, p.cantidad])),
      frios: f.frios,
      ganados30d: f.ganados30d,
    }));
    expect(filas).toEqual([
      {
        usuarioId: "usr-sofia",
        porEtapa: { NUEVO: 5, CONTACTADO: 4, VISITA: 3, COTIZADO: 8, NEGOCIACION: 5 },
        frios: 5,
        ganados30d: 0,
      },
      {
        usuarioId: "usr-luis",
        porEtapa: { NUEVO: 3, CONTACTADO: 4, VISITA: 3, COTIZADO: 5, NEGOCIACION: 0 },
        frios: 6,
        ganados30d: 2,
      },
      {
        usuarioId: "usr-jorge",
        porEtapa: { NUEVO: 2, CONTACTADO: 1, VISITA: 3, COTIZADO: 4, NEGOCIACION: 0 },
        frios: 3,
        ganados30d: 1,
      },
    ]);
  });
});
