import { describe, expect, it } from "vitest";
import {
  ahorroNegociacion,
  mejorPropuestaPorRonda,
  montoEnRonda,
  tasaRespuesta,
  acumuladoComprometido,
  alertasObra,
  contratosSinCaptura,
  DEMO_TODAY,
  indicadoresObra,
  lunesDeSemana,
  montoContrato,
  presupuestoProyecto,
  resumenObra,
  semaforoTerreno,
  aplicarResumenObra,
  erroresCorte,
} from "@/domain";
import { crearSeed } from "./seed";
import { PROVEEDORES_OBRA } from "./licitaciones";
import { ID_TERRENO_HEROE } from "./obra";

const seed = crearSeed();
const { contratos, cronograma } = seed.obra;
const deTerreno = <T extends { terrenoId: string }>(lista: T[], id: string) =>
  lista.filter((x) => x.terrenoId === id);

describe("obra del seed", () => {
  it("el id del héroe corresponde a Valle Real", () => {
    expect(seed.terrenos.find((t) => t.id === ID_TERRENO_HEROE)?.nombre).toBe(
      "Terreno Valle Real",
    );
  });

  it("el héroe tiene 5-6 contratos por 40-60 MDP; hay 3 proyectos con obra", () => {
    const heroe = deTerreno(contratos, ID_TERRENO_HEROE);
    expect(heroe.length).toBeGreaterThanOrEqual(5);
    expect(heroe.length).toBeLessThanOrEqual(6);
    const total = presupuestoProyecto(heroe);
    expect(total).toBeGreaterThan(40_000_000);
    expect(total).toBeLessThan(60_000_000);
    expect(new Set(contratos.map((c) => c.terrenoId)).size).toBe(3);
  });

  it("todo contrato apunta a un terreno, tiene conceptos y monto positivo", () => {
    const terrenos = new Set(seed.terrenos.map((t) => t.id));
    for (const c of contratos) {
      expect(terrenos.has(c.terrenoId)).toBe(true);
      expect(c.conceptos.length).toBeGreaterThan(0);
      expect(montoContrato(c)).toBeGreaterThan(0);
    }
    const folios = contratos.map((c) => c.folio);
    expect(new Set(folios).size).toBe(folios.length);
  });

  it("las fechas son coherentes: inicio ≤ fin y cada contrato tiene su actividad", () => {
    for (const a of cronograma) expect(a.inicioPlan <= a.finPlan).toBe(true);
    for (const c of contratos) {
      expect(c.inicioPlan <= c.finPlan).toBe(true);
      const actividad = cronograma.find((a) => a.contratoObraId === c.id);
      expect(actividad).toMatchObject({
        terrenoId: c.terrenoId,
        fase: "CONSTRUCCION",
        inicioPlan: c.inicioPlan,
        finPlan: c.finPlan,
      });
    }
  });

  it("la construcción queda entre la licitación y la entrega de cada proyecto", () => {
    for (const id of new Set(contratos.map((c) => c.terrenoId))) {
      const acts = deTerreno(cronograma, id);
      const fin = (fase: string) =>
        acts.filter((a) => a.fase === fase).map((a) => a.finPlan);
      const ini = (fase: string) =>
        acts.filter((a) => a.fase === fase).map((a) => a.inicioPlan);
      const construccion = deTerreno(contratos, id);
      expect(
        Math.min(...construccion.map((c) => Date.parse(c.inicioPlan))),
      ).toBeGreaterThan(Date.parse(fin("LICITACION").sort().at(-1)!));
      expect(Math.max(...construccion.map((c) => Date.parse(c.finPlan)))).toBeLessThan(
        Date.parse(ini("ENTREGA")[0]),
      );
    }
  });

  it("el cronograma del héroe contiene a hoy y no inventa fechas reales futuras", () => {
    const acts = deTerreno(cronograma, ID_TERRENO_HEROE);
    const inicio = acts.map((a) => a.inicioPlan).sort()[0];
    const fin = acts
      .map((a) => a.finPlan)
      .sort()
      .at(-1)!;
    expect(inicio < DEMO_TODAY && DEMO_TODAY < fin).toBe(true);
    for (const a of cronograma) {
      if (a.inicioReal) expect(a.inicioReal <= DEMO_TODAY).toBe(true);
      if (a.finReal) expect(a.finReal <= DEMO_TODAY).toBe(true);
    }
  });
});

describe("cortes y pagos del seed", () => {
  const { cortes, pagos } = seed.obra;
  const deHeroe = contratos.filter((c) => c.terrenoId === ID_TERRENO_HEROE);
  const idsHeroe = new Set(deHeroe.map((c) => c.id));
  const cortesHeroe = cortes.filter((c) => idsHeroe.has(c.contratoObraId));
  const pagosHeroe = pagos.filter((p) => idsHeroe.has(p.contratoObraId));
  const muros = deHeroe.find((c) => c.partida === "MUROS")!;

  it("los cortes apuntan a contratos y conceptos reales, en lunes y sin repetir semana viva", () => {
    const ids = new Set(contratos.map((c) => c.id));
    const vistos = new Set<string>();
    for (const corte of cortes) {
      expect(ids.has(corte.contratoObraId)).toBe(true);
      expect(lunesDeSemana(corte.semana)).toBe(corte.semana);
      const contrato = contratos.find((c) => c.id === corte.contratoObraId)!;
      const conceptos = new Set(contrato.conceptos.map((c) => c.id));
      for (const v of corte.volumenes) expect(conceptos.has(v.conceptoId)).toBe(true);
      expect(corte.evidencia.length).toBeGreaterThan(0);
      if (corte.estado !== "RECHAZADO") {
        const clave = `${corte.contratoObraId}-${corte.semana}`;
        expect(vistos.has(clave)).toBe(false);
        vistos.add(clave);
      }
    }
    expect(new Set(cortes.map((c) => c.id)).size).toBe(cortes.length);
    expect(new Set(pagos.map((p) => p.id)).size).toBe(pagos.length);
  });

  it("ningún acumulado vivo pasa del volumen contratado ni hay datos del futuro", () => {
    for (const contrato of contratos) {
      const acumulado = acumuladoComprometido(contrato.id, cortes);
      for (const concepto of contrato.conceptos) {
        expect(acumulado[concepto.id] ?? 0).toBeLessThanOrEqual(
          concepto.volumenContratado + 1e-6,
        );
      }
    }
    for (const p of pagos) expect(p.fecha <= DEMO_TODAY).toBe(true);
    for (const c of cortes) expect(c.firmadoEn && c.firmadoEn <= DEMO_TODAY).toBe(true);
  });

  it("el héroe va atrasado: SPI < 0.9, CPI cerca de 0.95 y término proyectado tarde", () => {
    const i = indicadoresObra(deHeroe, cortesHeroe, pagosHeroe, DEMO_TODAY)!;
    expect(i.spi).toBeLessThan(0.9);
    expect(i.spi).toBeGreaterThan(0.8);
    expect(i.cpi).toBeGreaterThan(0.93);
    expect(i.cpi).toBeLessThan(0.97);
    expect(i.diasRetraso).toBeGreaterThanOrEqual(21);
    expect(i.diasRetraso).toBeLessThanOrEqual(42);
  });

  it("deja un corte firmado por validar y la semana del 2026-10-26 libre en MUROS", () => {
    const pendientes = cortesHeroe.filter((c) => c.estado === "FIRMADO_SUPERVISOR");
    expect(pendientes).toHaveLength(1);
    expect(cortesHeroe.some((c) => c.estado === "RECHAZADO")).toBe(true);
    expect(
      cortes.some((c) => c.contratoObraId === muros.id && c.semana === "2026-10-26"),
    ).toBe(false);
    const libre = erroresCorte(muros, cortes, {
      contratoObraId: muros.id,
      semana: "2026-10-26",
      volumenes: [{ conceptoId: muros.conceptos[0].id, volumen: 100 }],
    });
    expect(libre.semana).toBeUndefined();
    expect(contratosSinCaptura(deHeroe, cortes, DEMO_TODAY).map((c) => c.id)).toContain(
      muros.id,
    );
  });

  it("las alertas del héroe señalan MUROS y el semáforo derivado es rojo", () => {
    const alertas = alertasObra(deHeroe, cortesHeroe, pagosHeroe, DEMO_TODAY);
    expect(alertas[0]).toMatchObject({ nivel: "ROJO" });
    expect(alertas.find((a) => a.tipo === "RETRASO_CONTRATO")?.contratoObraId).toBe(
      muros.id,
    );
    expect(alertas.some((a) => a.tipo === "VALIDACION_PENDIENTE")).toBe(true);
    const terreno = seed.terrenos.find((t) => t.id === ID_TERRENO_HEROE)!;
    const derivado = aplicarResumenObra(
      terreno,
      resumenObra(deHeroe, cortesHeroe, pagosHeroe, DEMO_TODAY),
    );
    expect(semaforoTerreno(derivado, DEMO_TODAY)).toBe("ROJO");
    expect(derivado.avancePct).not.toBe(terreno.avancePct);
  });

  it("los proyectos ligeros van en tiempo: SPI cerca de 1 y sin alertas rojas", () => {
    for (const id of new Set(contratos.map((c) => c.terrenoId))) {
      if (id === ID_TERRENO_HEROE) continue;
      const propios = contratos.filter((c) => c.terrenoId === id);
      const ids = new Set(propios.map((c) => c.id));
      const cs = cortes.filter((c) => ids.has(c.contratoObraId));
      const ps = pagos.filter((p) => ids.has(p.contratoObraId));
      const i = indicadoresObra(propios, cs, ps, DEMO_TODAY)!;
      expect(i.spi).toBeGreaterThanOrEqual(0.97);
      expect(
        alertasObra(propios, cs, ps, DEMO_TODAY).some((a) => a.nivel === "ROJO"),
      ).toBe(false);
    }
  });
});

describe("licitaciones del seed", () => {
  const { licitaciones } = seed;
  const delHeroe = licitaciones.filter((l) => l.terrenoId === ID_TERRENO_HEROE);
  const proveedores = new Set(PROVEEDORES_OBRA.map((p) => p.id));

  it("hay una adjudicada por contrato del héroe, con el monto del contrato, y una en curso", () => {
    const heroe = deTerreno(contratos, ID_TERRENO_HEROE);
    for (const contrato of heroe) {
      const lic = licitaciones.find((l) => l.contratoObraId === contrato.id);
      expect(lic?.estado).toBe("ADJUDICADA");
      expect(lic?.montoAdjudicado).toBe(montoContrato(contrato));
      expect(lic?.partida).toBe(contrato.partida);
    }
    const enCurso = delHeroe.filter((l) => l.estado === "EN_CURSO");
    expect(enCurso).toHaveLength(1);
    expect(enCurso[0].partida).toBe("ACABADOS");
    expect(delHeroe).toHaveLength(heroe.length + 1);
  });

  it("los proyectos ligeros no llevan licitaciones", () => {
    expect(licitaciones.every((l) => l.terrenoId === ID_TERRENO_HEROE)).toBe(true);
  });

  it("MUROS: 10 invitados, 3 respuestas y 3 rondas", () => {
    const muros = delHeroe.find((l) => l.partida === "MUROS")!;
    expect(muros.invitados).toHaveLength(10);
    expect(tasaRespuesta(muros).respondieron).toBe(3);
    expect(muros.rondas).toHaveLength(3);
  });

  it("cada licitación es coherente: 6-10 invitados, 3-4 respuestas, 2-3 rondas, ganador activo y más barato", () => {
    for (const lic of delHeroe.filter((l) => l.estado === "ADJUDICADA")) {
      expect(lic.invitados.length).toBeGreaterThanOrEqual(6);
      expect(lic.invitados.length).toBeLessThanOrEqual(10);
      expect(tasaRespuesta(lic).respondieron).toBeGreaterThanOrEqual(3);
      expect(tasaRespuesta(lic).respondieron).toBeLessThanOrEqual(4);
      expect(lic.rondas.length).toBeGreaterThanOrEqual(2);
      expect(lic.rondas.length).toBeLessThanOrEqual(3);
      const ultima = lic.rondas[lic.rondas.length - 1];
      expect(montoEnRonda(ultima, lic.ganadorId!)).toBe(lic.montoAdjudicado);
      expect(mejorPropuestaPorRonda(lic).at(-1)?.proveedorId).toBe(lic.ganadorId);
      expect(ahorroNegociacion(lic)).toBeGreaterThan(0);
    }
  });

  it("proveedores existentes, sin descartar al ganador y fechas que no pasan de hoy", () => {
    for (const lic of licitaciones) {
      expect(lic.invitados.every((id) => proveedores.has(id))).toBe(true);
      expect(lic.descartados.some((d) => d.proveedorId === lic.ganadorId)).toBe(false);
      expect(lic.rondas.every((r) => r.fecha <= DEMO_TODAY)).toBe(true);
    }
  });
});
