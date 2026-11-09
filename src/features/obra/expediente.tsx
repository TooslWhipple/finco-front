"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers } from "lucide-react";
import { EmptyState, SegmentedControl } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { coordenadasTerreno } from "@/data/terrenos";
import { DEMO_TODAY } from "@/domain";
import {
  useCiudades,
  useContratosObra,
  useCortesObra,
  useCronograma,
  useLicitaciones,
  usePagosObra,
  usePlazas,
  useSesion,
  useTerrenos,
} from "@/hooks";
import type { ContextoExpediente } from "./contexto";
import { EncabezadoExpediente } from "./encabezado-expediente";
import { PESTANA_LICITACIONES, PESTANAS } from "./pestanas";

/** Expediente de un proyecto: del terreno a la entrega, en pestañas. */
export function Expediente({ terrenoId }: { terrenoId: string }) {
  const { rol } = useSesion();
  const terreno = useTerrenos().datos.find((t) => t.id === terrenoId);
  const ciudades = useCiudades().datos;
  const plazas = usePlazas().datos;
  const contratos = useContratosObra(terrenoId);
  const cronograma = useCronograma(terrenoId);
  const cortes = useCortesObra(terrenoId);
  const pagos = usePagosObra(terrenoId);
  const licitaciones = useLicitaciones(terrenoId);
  const [licitacionEnfocadaId, setLicitacionEnfocadaId] = useState<string | null>(null);
  const [pestanaId, setPestanaId] = useState(PESTANAS[0].id);

  if (!terreno) {
    return (
      <EmptyState
        icono={Layers}
        titulo="No encontramos este proyecto"
        descripcion="El terreno no existe o ya no está en el portafolio."
        accion={
          <Link href="/terrenos-y-proyectos" className={buttonVariants()}>
            Volver a terrenos y proyectos
          </Link>
        }
        className="py-24"
      />
    );
  }

  const ciudad = ciudades?.find((c) => c.id === terreno.ciudadId);
  const contexto: ContextoExpediente = {
    terreno,
    ciudad,
    posicion: ciudad ? coordenadasTerreno(terreno, ciudad, plazas ?? []) : undefined,
    contratos,
    cronograma,
    cortes,
    pagos,
    licitaciones,
    licitacionEnfocadaId,
    abrirLicitacion: (licitacionId) => {
      setLicitacionEnfocadaId(licitacionId);
      setPestanaId(PESTANA_LICITACIONES);
    },
    hoy: DEMO_TODAY,
    rol,
  };
  const visibles = PESTANAS.filter((p) => p.visible(contexto));
  const activa = visibles.find((p) => p.id === pestanaId) ?? visibles[0];

  return (
    <div className="space-y-6">
      <EncabezadoExpediente {...contexto} />
      <SegmentedControl
        etiqueta="Secciones del expediente"
        opciones={visibles.map((p) => ({ valor: p.id, etiqueta: p.etiqueta }))}
        valor={activa.id}
        onChange={(id) => {
          setLicitacionEnfocadaId(null);
          setPestanaId(id);
        }}
      />
      <activa.Componente {...contexto} />
    </div>
  );
}
