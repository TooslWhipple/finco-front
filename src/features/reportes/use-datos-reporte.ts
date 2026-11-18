"use client";

import { useMemo } from "react";
import { DEMO_TODAY } from "@/domain";
import {
  useAtribucionContratos,
  useCampanas,
  useCiudades,
  useContratosVivos,
  useCotizaciones,
  useExcepciones,
  useFacturas,
  useFuentesLocatario,
  useLocales,
  useLocatarios,
  usePlazas,
  useProspectos,
  useTerrenos,
} from "@/hooks";
import { MES_DEMO } from "@/lib/tiempo";
import type { DatosReporte } from "./tipos";

/**
 * Estado vivo de la demo compuesto como `DatosReporte` (contratos con terminaciones y
 * aperturas, facturas del corte de `MES_DEMO`). `undefined` mientras carga.
 */
export function useDatosReporte(): DatosReporte | undefined {
  const ciudades = useCiudades().datos;
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const contratos = useContratosVivos().datos;
  const facturas = useFacturas(MES_DEMO).datos;
  const prospectos = useProspectos().datos;
  const terrenos = useTerrenos().datos;
  const locatarios = useLocatarios().datos;
  const fuentesLocatario = useFuentesLocatario();
  const cotizaciones = useCotizaciones();
  const excepciones = useExcepciones();
  const campanas = useCampanas();
  const atribucionContratos = useAtribucionContratos();

  return useMemo<DatosReporte | undefined>(
    () =>
      ciudades && plazas && locales && contratos && facturas && locatarios
        ? {
            ciudades,
            plazas,
            locales,
            contratos,
            facturas,
            prospectos,
            terrenos,
            fuentesLocatario,
            cotizaciones,
            excepciones,
            campanas,
            atribucionContratos,
            hoy: DEMO_TODAY,
          }
        : undefined,
    [
      ciudades,
      plazas,
      locales,
      contratos,
      facturas,
      prospectos,
      terrenos,
      locatarios,
      fuentesLocatario,
      cotizaciones,
      excepciones,
      campanas,
      atribucionContratos,
    ],
  );
}
