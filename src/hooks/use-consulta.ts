"use client";

import { useEffect, useRef, useState } from "react";
import { obtenerRepositorios, type Repositorios } from "@/services";

export interface Consulta<T> {
  datos: T | undefined;
  cargando: boolean;
}

/**
 * Ejecuta una consulta a los repositorios. Se vuelve a ejecutar solo cuando
 * cambia `clave` (los parámetros de la consulta), no en cada render.
 */
export function useConsulta<T>(
  consulta: (repos: Repositorios) => Promise<T>,
  clave: readonly unknown[] = [],
): Consulta<T> {
  const ultima = useRef(consulta);
  useEffect(() => {
    ultima.current = consulta;
  });
  const claveTexto = JSON.stringify(clave);
  const [resultado, setResultado] = useState<{ clave: string; datos: T }>();

  useEffect(() => {
    let vigente = true;
    void ultima.current(obtenerRepositorios()).then((datos) => {
      if (vigente) setResultado({ clave: claveTexto, datos });
    });
    return () => {
      vigente = false;
    };
  }, [claveTexto]);

  const actual = resultado?.clave === claveTexto;
  return { datos: actual ? resultado?.datos : undefined, cargando: !actual };
}
