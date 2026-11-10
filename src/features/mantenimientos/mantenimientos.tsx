"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Wrench } from "lucide-react";
import {
  BarraFiltros,
  EmptyState,
  PageHeader,
  SectionCard,
  SegmentedControl,
  SelectorPill,
  TablaConDetalle,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/config/permissions";
import { useMantenimientos, useSesion } from "@/hooks";
import { formatNumero } from "@/lib/format";
import { useAppStore } from "@/store";
import {
  FILTRO_INICIAL,
  TODOS,
  filtrarMantenimientos,
  type FiltroMantenimientosVista,
} from "./agregados";
import { useContextoMantenimiento } from "./contexto";
import { DetalleMantenimiento } from "./detalle-mantenimiento";
import { DialogoNuevoMantenimiento } from "./dialogos-mantenimiento";
import { KpisMantenimiento } from "./kpis-mantenimiento";
import { PanelPresupuestos } from "./panel-presupuestos";
import { TablaMantenimientos } from "./tabla-mantenimientos";
import { TableroMantenimientos } from "./tablero-mantenimientos";

type Vista = "TABLERO" | "TABLA";

const VISTAS = [
  { valor: "TABLERO", etiqueta: "Tablero" },
  { valor: "TABLA", etiqueta: "Tabla" },
] as const;

/** Vista global de mantenimientos: KPIs, filtros, tablero o tabla y detalle lateral. */
export function Mantenimientos() {
  const { rol } = useSesion();
  const todos = useMantenimientos().datos;
  const contexto = useContextoMantenimiento();
  const crearMantenimiento = useAppStore((s) => s.crearMantenimiento);
  const transicionarMantenimiento = useAppStore((s) => s.transicionarMantenimiento);

  const [vista, setVista] = useState<Vista>("TABLERO");
  const [filtro, setFiltro] = useState<FiltroMantenimientosVista>(FILTRO_INICIAL);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const visibles = useMemo(
    () => filtrarMantenimientos(todos, filtro, contexto.buscable),
    [todos, filtro, contexto],
  );
  const tablaOrdenada = useMemo(
    () =>
      [...visibles].sort((a, b) => b.fechaProgramada.localeCompare(a.fechaProgramada)),
    [visibles],
  );
  const plazasConTrabajos = useMemo(
    () => [...new Set(todos.map((m) => m.plazaId))],
    [todos],
  );
  const plazasAlta = useMemo(
    () => contexto.plazas.filter((p) => p.estatus === "EN_OPERACION"),
    [contexto.plazas],
  );
  const seleccionado = todos.find((m) => m.id === seleccionadoId);
  const puedeGestionar = can(rol, "mantenimientos.gestionar");

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mantenimientos"
        descripcion="Trabajos preventivos y correctivos de plazas y locales: estatus, proveedor, costo y evidencia."
        acciones={
          puedeGestionar ? (
            <Button
              onClick={() => setCreando(true)}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              <Plus aria-hidden />
              Nuevo mantenimiento
            </Button>
          ) : undefined
        }
      />
      {!puedeGestionar ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Los mantenimientos los gestiona Superadmin.
        </p>
      ) : null}

      <KpisMantenimiento mantenimientos={visibles} />

      <PanelPresupuestos
        contexto={contexto}
        plazaId={filtro.plazaId === TODOS ? undefined : filtro.plazaId}
      />

      <BarraFiltros
        envolver
        derecha={
          <>
            <label className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-text-muted"
              />
              <Input
                type="search"
                aria-label="Buscar mantenimiento"
                placeholder="Buscar folio, trabajo o proveedor"
                value={filtro.texto}
                onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value }))}
                className="h-9 w-64 rounded-full pl-9"
              />
            </label>
            <SegmentedControl
              etiqueta="Vista"
              opciones={VISTAS}
              valor={vista}
              onChange={setVista}
            />
          </>
        }
      >
        <SelectorPill
          etiqueta="Filtrar por plaza"
          valor={filtro.plazaId}
          opciones={[
            { valor: TODOS, etiqueta: "Todas las plazas" },
            ...plazasConTrabajos
              .map((id) => ({ valor: id, etiqueta: contexto.nombrePlaza(id) }))
              .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es")),
          ]}
          onChange={(plazaId) => setFiltro((f) => ({ ...f, plazaId }))}
        />
        <SelectorPill
          etiqueta="Filtrar por tipo"
          valor={filtro.tipo}
          opciones={[
            { valor: TODOS, etiqueta: "Todos los tipos" },
            { valor: "PREVENTIVO", etiqueta: "Preventivo" },
            { valor: "CORRECTIVO", etiqueta: "Correctivo" },
          ]}
          onChange={(tipo) => setFiltro((f) => ({ ...f, tipo: tipo as typeof f.tipo }))}
        />
        <SelectorPill
          etiqueta="Filtrar por cargo"
          valor={filtro.cargo}
          opciones={[
            { valor: TODOS, etiqueta: "Todo cargo" },
            { valor: "PLAZA", etiqueta: "Cargo a plaza" },
            { valor: "LOCATARIO", etiqueta: "Cargo a locatario" },
          ]}
          onChange={(cargo) =>
            setFiltro((f) => ({ ...f, cargo: cargo as typeof f.cargo }))
          }
        />
      </BarraFiltros>

      <TablaConDetalle
        anchoPanel="26rem"
        etiqueta="Detalle del mantenimiento"
        onCerrar={() => setSeleccionadoId(null)}
        lista={
          <SectionCard
            titulo={`Mantenimientos (${formatNumero(visibles.length)})`}
            className="min-w-0"
          >
            {visibles.length === 0 ? (
              <EmptyState
                icono={Wrench}
                titulo="Sin mantenimientos con estos filtros"
                descripcion="Quita un filtro para ver más trabajos."
              />
            ) : vista === "TABLERO" ? (
              <TableroMantenimientos
                mantenimientos={visibles}
                contexto={contexto}
                seleccionadoId={seleccionadoId ?? undefined}
                onSeleccionar={(m) => setSeleccionadoId(m.id)}
              />
            ) : (
              <TablaMantenimientos
                mantenimientos={tablaOrdenada}
                contexto={contexto}
                onSeleccionar={(m) => setSeleccionadoId(m.id)}
              />
            )}
          </SectionCard>
        }
        detalle={
          seleccionado ? (
            <DetalleMantenimiento
              mantenimiento={seleccionado}
              contexto={contexto}
              puedeGestionar={puedeGestionar}
              onTransicionar={transicionarMantenimiento}
              onCerrar={() => setSeleccionadoId(null)}
            />
          ) : null
        }
      />

      {creando ? (
        <DialogoNuevoMantenimiento
          abierto
          onCambioAbierto={setCreando}
          plazas={plazasAlta}
          proveedores={contexto.proveedores}
          filtro={{}}
          onCrear={crearMantenimiento}
        />
      ) : null}
    </div>
  );
}
