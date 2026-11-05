"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Map as IconoMapa, MapPinOff, Plus } from "lucide-react";
import {
  BarraFiltros,
  EmptyState,
  KpiCard,
  KpiRow,
  SectionCard,
  SegmentedControl,
  SelectorPill,
  StatusChip,
} from "@/components/shared";
import { contextoVialPlanta } from "@/data/planos";
import { INPC_ANUAL, incrementoPct, prospectosPorLocal } from "@/domain";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  useCiudades,
  useContratos,
  useCotizaciones,
  useFacturas,
  useLocales,
  useLocatarios,
  useProspectos,
  usePlantas,
  usePlaza,
  useSesion,
} from "@/hooks";
import { avisarProximaFase } from "@/lib/avisos";
import { formatMoneda, formatNumero } from "@/lib/format";
import { MES_DEMO } from "@/lib/tiempo";
import { cn } from "@/lib/utils";
import { SeccionMantenimientos } from "@/features/mantenimientos/seccion-mantenimientos";
import { FichaLocal } from "./ficha-local";
import { PlanoLocales } from "./plano-locales";
import { ProximosVencimientos } from "./proximos-vencimientos";
import {
  CATEGORIAS,
  ETIQUETA_CATEGORIA,
  categoriaLocal,
  crearContextoPlaza,
  proximosVencimientos,
  resumirLocalesPlaza,
  type CategoriaLocal,
} from "./resumen";

const TODOS = "TODOS";
const RUTA_COTIZACION = "/cotizaciones/nueva";

type VistaPlaza = "PLANO" | "MANTENIMIENTO";

const VISTAS_PLAZA = [
  { valor: "PLANO", etiqueta: "Plano" },
  { valor: "MANTENIMIENTO", etiqueta: "Mantenimiento" },
] as const;

const AÑO_INPC = 2026;
/** Filas de "Próximos vencimientos"; el KPI "Por vencer" cuenta todos. */
const VENCIMIENTOS_VISIBLES = 4;

export function PlazaDetalle({ plazaId }: { plazaId: string }) {
  const { rol } = useSesion();
  const plaza = usePlaza(plazaId);
  const ciudades = useCiudades().datos;
  const plantas = usePlantas(plazaId).datos;
  const locales = useLocales(plazaId).datos;
  const contratos = useContratos().datos;
  const locatarios = useLocatarios().datos;
  const facturas = useFacturas(MES_DEMO).datos;
  const cotizaciones = useCotizaciones();
  const prospectos = useProspectos().datos;

  const [plantaElegida, setPlantaElegida] = useState<string>();
  const [estatus, setEstatus] = useState<string>(TODOS);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [giro, setGiro] = useState<string>(TODOS);
  const [seleccion, setSeleccion] = useState<string>();
  const [vistaPlaza, setVistaPlaza] = useState<VistaPlaza>("PLANO");

  const prospectosActivos = useMemo(
    () =>
      new Map(
        [...prospectosPorLocal(prospectos ?? [])].map(([id, lista]) => [
          id,
          lista.length,
        ]),
      ),
    [prospectos],
  );

  const datos = useMemo(() => {
    if (!locales || !contratos || !facturas || !locatarios) return undefined;
    const ctx = crearContextoPlaza(locales, contratos, facturas);
    const categorias = new Map<string, CategoriaLocal>(
      locales.map((l) => [l.id, categoriaLocal(l, ctx)]),
    );
    const nombres = new Map(locatarios.map((l) => [l.id, l.nombre]));
    const nombrePorLocal = new Map<string, string>();
    for (const [localId, c] of ctx.contratoPorLocal) {
      const nombre = nombres.get(c.locatarioId);
      if (nombre) nombrePorLocal.set(localId, nombre);
    }
    return {
      categorias,
      nombres,
      nombrePorLocal,
      resumen: resumirLocalesPlaza(locales, contratos, facturas),
      vencimientos: proximosVencimientos(locales, contratos).slice(
        0,
        VENCIMIENTOS_VISIBLES,
      ),
      giros: [...new Set(locales.flatMap((l) => (l.giro ? [l.giro] : [])))].sort(),
    };
  }, [locales, contratos, facturas, locatarios]);

  if (plaza.datos === undefined && !plaza.cargando) {
    return (
      <SectionCard>
        <EmptyState
          icono={MapPinOff}
          titulo="Plaza no encontrada"
          descripcion="La plaza que buscas no existe en este prototipo."
          accion={
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Volver al inicio
            </Link>
          }
        />
      </SectionCard>
    );
  }

  const ciudad = ciudades?.find((c) => c.id === plaza.datos?.ciudadId);
  const plantaActiva = plantaElegida ?? plantas?.[0]?.id;
  const localesPlanta = (locales ?? []).filter((l) => l.plantaId === plantaActiva);
  // La ficha siempre muestra un local de la planta visible: la selección
  // manual si pertenece a ella; si no, A-09, el primer disponible o el primero.
  const elegidoEnPlanta = localesPlanta.find((l) => l.id === seleccion);
  const seleccionado =
    elegidoEnPlanta ??
    localesPlanta.find((l) => l.codigo === "A-09") ??
    localesPlanta.find((l) => l.estatus === "DISPONIBLE") ??
    localesPlanta[0];
  const seleccionId = seleccionado?.id;

  const coincidentes = new Set(
    localesPlanta
      .filter((l) => {
        const cat = datos?.categorias.get(l.id);
        if (estatus !== TODOS && cat !== estatus) return false;
        if (soloDisponibles && l.estatus !== "DISPONIBLE") return false;
        if (giro !== TODOS && l.giro !== giro) return false;
        return true;
      })
      .map((l) => l.id),
  );

  const resumen = datos?.resumen;
  const rutaCotizar = `${RUTA_COTIZACION}?local=${seleccionado?.id ?? ""}`;
  const rutaNueva =
    seleccionado?.estatus === "DISPONIBLE"
      ? rutaCotizar
      : `${RUTA_COTIZACION}?plaza=${plazaId}`;
  const cotizacionesAbiertas = seleccionado
    ? cotizaciones.filter(
        (c) => c.localId === seleccionado.id && c.estado !== "CONTRATO_GENERADO",
      ).length
    : 0;

  const contextoVial = plantaActiva ? contextoVialPlanta(plantaActiva) : undefined;
  const ubicacionLocal = seleccionado
    ? contextoVial?.ubicacionPorBloque[seleccionado.codigo.charAt(0)]
    : undefined;
  const incrementoAnual = plaza.datos?.reglaDefault
    ? incrementoPct(plaza.datos.reglaDefault, INPC_ANUAL[AÑO_INPC])
    : undefined;

  const ubicacion = [
    ciudad ? `${ciudad.nombre}, ${ciudad.estado}` : null,
    plaza.datos?.direccion,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {ubicacion ? (
            <p className="text-sm text-brand-text-muted">{ubicacion}</p>
          ) : null}
          <h1 className="mt-1 flex flex-wrap items-center gap-3 font-heading text-2xl font-bold text-brand-primary">
            {plaza.datos?.nombre ?? "Cargando plaza…"}
            {plaza.datos ? <StatusChip estatus={plaza.datos.estatus} /> : null}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/mapa-de-plazas?plaza=${plazaId}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <IconoMapa aria-hidden className="size-4" />
            Ver en mapa
          </Link>
          <button
            type="button"
            onClick={avisarProximaFase}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download aria-hidden className="size-4" />
            Exportar lista de precios
          </button>
          {can(rol, "cotizaciones.crear") ? (
            <Link href={rutaNueva} className={buttonVariants()}>
              <Plus aria-hidden className="size-4" />
              Nueva cotización
            </Link>
          ) : null}
        </div>
      </header>

      <SegmentedControl
        etiqueta="Vista de la plaza"
        opciones={VISTAS_PLAZA}
        valor={vistaPlaza}
        onChange={setVistaPlaza}
      />

      {vistaPlaza === "MANTENIMIENTO" ? (
        <SeccionMantenimientos filtro={{ plazaId }} conKpis />
      ) : (
        <>
          <KpiRow>
            <KpiCard
              etiqueta="Locales"
              valor={resumen ? formatNumero(resumen.total) : "—"}
              detalle={
                resumen && plantas
                  ? plantas
                      .map(
                        (p) =>
                          `${resumen.porPlanta[p.id] ?? 0} ${abreviaturaPlanta(p.nombre)}`,
                      )
                      .join(" · ")
                  : undefined
              }
            />
            <KpiCard
              etiqueta="Rentados"
              valor={resumen ? formatNumero(resumen.rentados) : "—"}
              detalle={
                resumen ? `${Math.round(resumen.ocupacion * 100)}% ocupación` : undefined
              }
              tono="positivo"
            />
            <KpiCard
              etiqueta="Disponibles"
              valor={resumen ? formatNumero(resumen.disponibles) : "—"}
              detalle={resumen ? `${resumen.enCotizacion} en cotización` : undefined}
            />
            <KpiCard
              etiqueta="Renta promedio"
              valor={resumen ? `${formatMoneda(resumen.rentaPromedioM2)} / m²` : "—"}
              delta={
                incrementoAnual !== undefined
                  ? {
                      texto: `${incrementoAnual.toLocaleString("es-MX", { maximumFractionDigits: 1 })}% anual`,
                      direccion: "sube",
                    }
                  : undefined
              }
              subtexto={incrementoAnual === undefined ? "Locales rentados" : undefined}
            />
            <KpiCard
              etiqueta="Por vencer"
              valor={resumen ? formatNumero(resumen.porVencer) : "—"}
              subtexto="próximos 90 días"
            />
            <KpiCard
              etiqueta="Con atraso"
              valor={resumen ? formatNumero(resumen.conAtraso) : "—"}
              subtexto={
                resumen ? `${formatMoneda(resumen.montoVencido)} vencido` : undefined
              }
            />
          </KpiRow>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21.5rem]">
            <SectionCard sinPadding className="min-w-0 overflow-hidden">
              <BarraFiltros
                envolver
                className="px-4 pt-4 pb-3 [&_button]:px-3 [&_button]:text-[13px] [&_select]:pr-7 [&_select]:pl-3 [&_select]:text-[13px] [&>div]:gap-1.5"
              >
                {plantas && plantaActiva ? (
                  <SegmentedControl
                    etiqueta="Planta"
                    opciones={plantas.map((p) => ({
                      valor: p.id,
                      etiqueta: `${p.nombre} · ${datos?.resumen.porPlanta[p.id] ?? 0}`,
                    }))}
                    valor={plantaActiva}
                    onChange={setPlantaElegida}
                    className="shrink-0 [&_button]:whitespace-nowrap"
                  />
                ) : null}
                <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-brand-line" />
                <SelectorPill
                  etiqueta="Filtrar por estatus"
                  valor={estatus}
                  onChange={setEstatus}
                  opciones={[
                    { valor: TODOS, etiqueta: "Estatus" },
                    ...CATEGORIAS.map((c) => ({
                      valor: c,
                      etiqueta: ETIQUETA_CATEGORIA[c],
                    })),
                  ]}
                />
                <button
                  type="button"
                  aria-pressed={soloDisponibles}
                  onClick={() => setSoloDisponibles((v) => !v)}
                  className={cn(
                    "h-9 shrink-0 cursor-pointer rounded-full border px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    soloDisponibles
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-brand-line bg-card text-brand-text hover:bg-brand-cream",
                  )}
                >
                  Solo disponibles
                </button>
                <SelectorPill
                  etiqueta="Filtrar por giro"
                  valor={giro}
                  onChange={setGiro}
                  opciones={[
                    { valor: TODOS, etiqueta: "Giro: todos" },
                    ...(datos?.giros ?? []).map((g) => ({
                      valor: g,
                      etiqueta: `Giro: ${g}`,
                    })),
                  ]}
                />
              </BarraFiltros>
              <div className="px-4 pb-4">
                {datos ? (
                  <PlanoLocales
                    locales={localesPlanta}
                    categorias={datos.categorias}
                    locatarios={datos.nombrePorLocal}
                    prospectos={prospectosActivos}
                    coincidentes={coincidentes}
                    contexto={contextoVial}
                    seleccionadoId={seleccionId}
                    onSeleccionar={(id) => {
                      setSeleccion(id);
                      const destino = locales?.find((l) => l.id === id)?.plantaId;
                      if (destino) setPlantaElegida(destino);
                    }}
                  />
                ) : (
                  <div className="flex h-96 items-center justify-center text-sm text-brand-text-muted">
                    Cargando plano…
                  </div>
                )}
              </div>
            </SectionCard>

            <div className="space-y-6">
              <FichaLocal
                local={seleccionado}
                planta={plantas?.find((p) => p.id === seleccionado?.plantaId)}
                categoria={
                  seleccionado ? datos?.categorias.get(seleccionado.id) : undefined
                }
                rol={rol}
                ubicacion={ubicacionLocal}
                prospectosActivos={
                  seleccionado ? (prospectosActivos.get(seleccionado.id) ?? 0) : 0
                }
                cotizacionesAbiertas={cotizacionesAbiertas}
                rutaFicha={`/plazas/${plazaId}/locales/${seleccionado?.id ?? ""}`}
                rutaCotizar={rutaCotizar}
              />
              <ProximosVencimientos
                vencimientos={datos?.vencimientos ?? []}
                locatarios={datos?.nombres ?? new Map()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** "Planta baja" → "PB", "Planta alta" → "PA". */
function abreviaturaPlanta(nombre: string): string {
  return nombre
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
