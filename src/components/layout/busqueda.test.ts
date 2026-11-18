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
const prospecto = crearProspecto({
  id: "pro-007",
  nombre: "Café Aurora",
  rfc: "CAU200101XYZ",
});
const farmacia = { id: "L-1", nombre: "Farmacia Central" };

const fuentes: FuentesBusqueda = {
  plazas: [],
  locales: [crearLocal({ id: "A-09", codigo: "A-09" })],
  locatarios: [farmacia],
  contratos: [
    crearContrato({ id: "ctr-1", locatarioId: "L-1" }),
    contratoDesdeCotizacion(cotizacion),
  ],
  prospectos: [prospecto],
  fuentesLocatario: {
    locatarios: [farmacia],
    prospectos: [prospecto],
    cotizaciones: [cotizacion],
  },
  terrenos: [crearTerreno({ nombre: "Reserva Norte" })],
};

const idsContratos = (consulta: string) =>
  buscarGlobal(fuentes, consulta, "DIRECCION").contratos.map((c) => c.contrato.id);

describe("buscarGlobal", () => {
  it("encuentra un contrato nacido de cotización por su folio visible", () => {
    const [encontrado] = buscarGlobal(fuentes, "ctr-2026-0418", "DIRECCION").contratos;
    expect(encontrado).toMatchObject({
      folio: "CTR-2026-0418",
      codigoLocal: "A-09",
      locatario: "Café Aurora",
    });
    expect(encontrado.contrato.id).toBe("ctr-COT-2026-0418");
  });

  it("sin folio el contrato se muestra y se busca por su id", () => {
    expect(buscarGlobal(fuentes, "ctr-1", "DIRECCION").contratos[0].folio).toBe("ctr-1");
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
        fuentesLocatario: { ...fuentes.fuentesLocatario, cotizaciones: [capturada] },
      },
      "prospecto demo",
      "DIRECCION",
    ).contratos;
    expect(encontrado.folio).toBe("CTR-2026-0500");
  });

  it("nombra al locatario aunque el prospecto no sea visible para la sesión", () => {
    const [encontrado] = buscarGlobal(
      { ...fuentes, prospectos: [] },
      "aurora",
      "DIRECCION",
    ).contratos;
    expect(encontrado.locatario).toBe("Café Aurora");
  });

  it("busca prospectos por razón social, RFC o giro y terrenos por nombre", () => {
    expect(buscarGlobal(fuentes, "cau200101", "DIRECCION").prospectos).toHaveLength(1);
    expect(buscarGlobal(fuentes, "  RESERVA ", "DIRECCION").terrenos).toHaveLength(1);
  });

  it("acota cada grupo", () => {
    const muchos = Array.from({ length: MAX_POR_GRUPO + 3 }, (_, i) =>
      crearTerreno({ id: `ter-${i}` }),
    );
    expect(
      buscarGlobal({ ...fuentes, terrenos: muchos }, "", "DIRECCION").terrenos,
    ).toHaveLength(MAX_POR_GRUPO);
  });

  it("el Gerente comercial no recibe terrenos; Dirección sí", () => {
    expect(buscarGlobal(fuentes, "reserva", "GERENTE_COMERCIAL").terrenos).toEqual([]);
    expect(buscarGlobal(fuentes, "reserva", "DIRECCION").terrenos).toHaveLength(1);
    expect(buscarGlobal(fuentes, "ctr-1", "GERENTE_COMERCIAL").contratos).toHaveLength(1);
  });

  it("cada rol pierde los grupos cuya ruta no abre", () => {
    const supervisor = buscarGlobal(fuentes, "", "SUPERVISOR_OBRA");
    expect(supervisor.contratos).toEqual([]);
    expect(supervisor.locales).toEqual([]);
    expect(supervisor.terrenos).toHaveLength(1);
    expect(buscarGlobal(fuentes, "", "COBRANZA").prospectos).toEqual([]);
    expect(buscarGlobal(fuentes, "", "COBRANZA").terrenos).toEqual([]);
  });
});
