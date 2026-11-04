import { describe, expect, it } from "vitest";
import { contratoDesdeCotizacion } from "@/domain";
import {
  crearContrato,
  crearCotizacion,
  crearLocal,
  crearProspecto,
  crearTerreno,
} from "@/domain/fixtures";
import { MAX_POR_GRUPO, buscarGlobal, type FuentesBusqueda } from "./busqueda";

const cotizacion = crearCotizacion({ id: "COT-2026-0418", prospectoId: "pro-007" });

const fuentes: FuentesBusqueda = {
  plazas: [],
  locales: [crearLocal({ id: "A-09", codigo: "A-09" })],
  locatarios: [{ id: "L-1", nombre: "Farmacia Central" }],
  contratos: [
    crearContrato({ id: "ctr-1", locatarioId: "L-1" }),
    contratoDesdeCotizacion(cotizacion),
  ],
  prospectos: [
    crearProspecto({ id: "pro-007", nombre: "Café Aurora", rfc: "CAU200101XYZ" }),
  ],
  cotizaciones: [cotizacion],
  terrenos: [crearTerreno({ nombre: "Reserva Norte" })],
};

const idsContratos = (consulta: string) =>
  buscarGlobal(fuentes, consulta).contratos.map((c) => c.contrato.id);

describe("buscarGlobal", () => {
  it("encuentra un contrato nacido de cotización por su folio visible", () => {
    const [encontrado] = buscarGlobal(fuentes, "ctr-2026-0418").contratos;
    expect(encontrado).toMatchObject({
      folio: "CTR-2026-0418",
      codigoLocal: "A-09",
      locatario: "Café Aurora",
    });
    expect(encontrado.contrato.id).toBe("ctr-COT-2026-0418");
  });

  it("sin folio el contrato se muestra y se busca por su id", () => {
    expect(buscarGlobal(fuentes, "ctr-1").contratos[0].folio).toBe("ctr-1");
  });

  it("busca contratos por el locatario del catálogo o el prospecto en trámite", () => {
    expect(idsContratos("farmacia")).toEqual(["ctr-1"]);
    expect(idsContratos("aurora")).toEqual(["ctr-COT-2026-0418"]);
  });

  it("sin prospecto registrado usa el nombre capturado en la cotización", () => {
    const capturada = crearCotizacion({ id: "COT-2026-0500" });
    const [encontrado] = buscarGlobal(
      {
        ...fuentes,
        contratos: [contratoDesdeCotizacion(capturada)],
        cotizaciones: [capturada],
      },
      "prospecto demo",
    ).contratos;
    expect(encontrado.folio).toBe("CTR-2026-0500");
  });

  it("busca prospectos por razón social, RFC o giro y terrenos por nombre", () => {
    expect(buscarGlobal(fuentes, "cau200101").prospectos).toHaveLength(1);
    expect(buscarGlobal(fuentes, "  RESERVA ").terrenos).toHaveLength(1);
  });

  it("acota cada grupo", () => {
    const muchos = Array.from({ length: MAX_POR_GRUPO + 3 }, (_, i) =>
      crearTerreno({ id: `ter-${i}` }),
    );
    expect(buscarGlobal({ ...fuentes, terrenos: muchos }, "").terrenos).toHaveLength(
      MAX_POR_GRUPO,
    );
  });
});
