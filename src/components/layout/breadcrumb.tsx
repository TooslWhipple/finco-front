"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { useLocal, usePlaza } from "@/hooks";

const ETIQUETAS: Readonly<Record<string, string>> = {
  plazas: "Plazas y locales",
  cotizaciones: "Cotizaciones",
  nueva: "Nueva cotización",
  "mapa-de-plazas": "Mapa de plazas",
  prospectos: "Prospectos",
  contratos: "Contratos",
  "terrenos-y-proyectos": "Terrenos y proyectos",
  cobranza: "Cobranza",
  mantenimientos: "Mantenimientos",
  integraciones: "Integraciones",
  reportes: "Reportes",
  configuracion: "Configuración",
  "precios-y-reglas": "Precios y reglas",
};

/** `/plazas` agrupa las plazas pero no es una pantalla: no se enlaza. */
const RAIZ_SIN_PANTALLA = "/plazas";

function NombrePlaza({ id }: { id: string }) {
  const { datos } = usePlaza(id);
  return <>{datos?.nombre ?? id}</>;
}

function CodigoLocal({ id }: { id: string }) {
  const { datos } = useLocal(id);
  return <>{datos ? `Local ${datos.codigo}` : id}</>;
}

/** Etiqueta de un segmento de la ruta; los ids se resuelven contra los datos. */
function Etiqueta({ segmentos, indice }: { segmentos: string[]; indice: number }) {
  const segmento = segmentos[indice];
  const previo = segmentos[indice - 1];
  if (previo === "plazas") return <NombrePlaza id={segmento} />;
  if (previo === "locales") return <CodigoLocal id={segmento} />;
  if (segmento === "locales") return <>Locales</>;
  return <>{ETIQUETAS[segmento] ?? segmento}</>;
}

export function Breadcrumb() {
  const ruta = usePathname();
  const segmentos = ruta.split("/").filter(Boolean);
  // "/locales" no es una pantalla: su segmento solo ancla el id del local.
  const visibles = segmentos.map((_, i) => i).filter((i) => segmentos[i] !== "locales");

  if (segmentos.length === 0) {
    return (
      <nav
        aria-label="Ruta"
        className="shrink-0 text-sm whitespace-nowrap text-brand-text-muted"
      >
        Inicio / <span className="font-medium text-brand-text">Panorama de plazas</span>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Ruta"
      className="flex min-w-0 flex-1 items-center gap-1.5 text-sm whitespace-nowrap text-brand-text-muted [&>span:last-child]:min-w-0 [&>span:last-child]:truncate"
    >
      <Link href="/" className="hover:text-brand-primary">
        Inicio
      </Link>
      {visibles.map((i, n) => {
        const ultimo = n === visibles.length - 1;
        const href = `/${segmentos.slice(0, i + 1).join("/")}`;
        return (
          <Fragment key={href}>
            <span aria-hidden>/</span>
            {ultimo || href === RAIZ_SIN_PANTALLA ? (
              <span
                aria-current={ultimo ? "page" : undefined}
                className={ultimo ? "font-medium text-brand-text" : undefined}
              >
                <Etiqueta segmentos={segmentos} indice={i} />
              </span>
            ) : (
              <Link href={href} className="hover:text-brand-primary">
                <Etiqueta segmentos={segmentos} indice={i} />
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
