"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Pencil, Plus } from "lucide-react";
import {
  BarraFiltros,
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  PageHeader,
  PillsFiltro,
  SectionCard,
  SelectorPill,
  StatusChip,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  ETIQUETA_CATEGORIA_MANTENIMIENTO,
  ETIQUETA_PARTIDA,
  type Proveedor,
} from "@/domain";
import { usePlazas, useProveedores, useSesion } from "@/hooks";
import { formatNumero } from "@/lib/format";
import { DialogoProveedor } from "./dialogo-proveedor";
import { OPCIONES_CATEGORIA, OPCIONES_PARTIDA } from "./esquemas";

const TODOS = "TODOS";

type Tipo = typeof TODOS | "MANTENIMIENTO" | "OBRA";
type FiltroActivo = typeof TODOS | "ACTIVOS" | "INACTIVOS";

interface Filtro {
  tipo: Tipo;
  /** Categoría (mantenimiento) o partida (obra) del tipo elegido. */
  especialidad: string;
  plazaId: string;
  activo: FiltroActivo;
}

const FILTRO_INICIAL: Filtro = {
  tipo: TODOS,
  especialidad: TODOS,
  plazaId: TODOS,
  activo: TODOS,
};

const esDeMantenimiento = (p: Proveedor) => p.especialidadesMantenimiento.length > 0;
const esDeObra = (p: Proveedor) => p.partidasObra.length > 0;

function cumpleFiltro(p: Proveedor, f: Filtro): boolean {
  if (f.tipo === "MANTENIMIENTO") {
    if (!esDeMantenimiento(p)) return false;
    if (
      f.especialidad !== TODOS &&
      !p.especialidadesMantenimiento.some((c) => c === f.especialidad)
    )
      return false;
  }
  if (f.tipo === "OBRA") {
    if (!esDeObra(p)) return false;
    if (f.especialidad !== TODOS && !p.partidasObra.some((c) => c === f.especialidad))
      return false;
  }
  if (f.plazaId !== TODOS && !p.plazaIds.includes(f.plazaId)) return false;
  if (f.activo === "ACTIVOS" && !p.activo) return false;
  if (f.activo === "INACTIVOS" && p.activo) return false;
  return true;
}

/** Lo que atiende: categorías de mantenimiento y partidas de obra, en texto. */
export function especialidades(p: Proveedor): string {
  return [
    ...p.especialidadesMantenimiento.map((c) => ETIQUETA_CATEGORIA_MANTENIMIENTO[c]),
    ...p.partidasObra.map((c) => ETIQUETA_PARTIDA[c]),
  ].join(", ");
}

function tipoDe(p: Proveedor): string {
  if (esDeMantenimiento(p) && esDeObra(p)) return "Mantenimiento y obra";
  if (esDeObra(p)) return "Obra";
  if (esDeMantenimiento(p)) return "Mantenimiento";
  return "Sin especialidad";
}

/** Padrón único de proveedores: filtros, KPIs, alta y edición (PMO y Superadmin). */
export function Proveedores() {
  const router = useRouter();
  const { rol } = useSesion();
  const padron = useProveedores();
  const plazas = usePlazas().datos;
  const puedeGestionar = can(rol, "proveedores.gestionar");

  const [filtro, setFiltro] = useState<Filtro>(FILTRO_INICIAL);
  const [creando, setCreando] = useState(false);
  // El id se conserva al cerrar para que el diálogo no cambie de contenido mientras se va.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const editando = padron.find((p) => p.id === editandoId);

  const visibles = useMemo(
    () => padron.filter((p) => cumpleFiltro(p, filtro)),
    [padron, filtro],
  );
  const opcionesPlaza = useMemo(
    () =>
      [...(plazas ?? [])]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        .map((p) => ({ valor: p.id, etiqueta: p.nombre })),
    [plazas],
  );

  const columnas = useMemo<ColumnDef<Proveedor>[]>(
    () => [
      {
        id: "nombre",
        header: "Proveedor",
        accessorFn: (p) => p.nombre,
        cell: ({ row }) => (
          <span className="block">
            <Link
              href={`/proveedores/${row.original.id}`}
              className="block font-medium text-brand-primary hover:underline"
            >
              {row.original.nombre}
            </Link>
            <span className="block text-xs text-brand-text-muted">
              {row.original.rfc}
            </span>
          </span>
        ),
      },
      { id: "tipo", header: "Tipo", accessorFn: tipoDe },
      {
        id: "especialidades",
        header: "Especialidades y partidas",
        accessorFn: especialidades,
      },
      {
        id: "plazas",
        header: "Plazas",
        accessorFn: (p) => p.plazaIds.length,
        cell: ({ row }) => formatNumero(row.original.plazaIds.length),
      },
      {
        id: "contacto",
        header: "Contacto",
        accessorFn: (p) => p.contacto.nombre,
        cell: ({ row }) => {
          const { nombre, whatsapp } = row.original.contacto;
          return nombre || whatsapp ? (
            <span className="block">
              <span className="block">{nombre || "—"}</span>
              <span className="block text-xs text-brand-text-muted">{whatsapp}</span>
            </span>
          ) : (
            <span className="text-brand-text-muted">—</span>
          );
        },
      },
      {
        id: "estatus",
        header: "Estatus",
        accessorFn: (p) => (p.activo ? "ACTIVO" : "INACTIVO"),
        cell: ({ row }) => (
          <StatusChip estatus={row.original.activo ? "ACTIVO" : "INACTIVO"} />
        ),
      },
      ...(puedeGestionar
        ? [
            {
              id: "acciones",
              header: "",
              enableSorting: false,
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${row.original.nombre}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditandoId(row.original.id);
                    setEditarAbierto(true);
                  }}
                >
                  <Pencil aria-hidden />
                  Editar
                </Button>
              ),
            } satisfies ColumnDef<Proveedor>,
          ]
        : []),
    ],
    [puedeGestionar],
  );

  const opcionesEspecialidad =
    filtro.tipo === "MANTENIMIENTO"
      ? OPCIONES_CATEGORIA
      : filtro.tipo === "OBRA"
        ? OPCIONES_PARTIDA
        : [];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Proveedores"
        descripcion="Padrón único de proveedores de mantenimiento y contratistas de obra: qué atienden, en qué plazas y cuánto han cobrado."
        acciones={
          puedeGestionar ? (
            <Button
              onClick={() => setCreando(true)}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              <Plus aria-hidden />
              Nuevo proveedor
            </Button>
          ) : undefined
        }
      />
      {!puedeGestionar ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. El padrón lo administran la PMO y Superadmin.
        </p>
      ) : null}

      <KpiRow>
        <KpiCard etiqueta="Proveedores" valor={formatNumero(padron.length)} />
        <KpiCard
          etiqueta="De mantenimiento"
          valor={formatNumero(padron.filter(esDeMantenimiento).length)}
        />
        <KpiCard
          etiqueta="De obra"
          valor={formatNumero(padron.filter(esDeObra).length)}
        />
        <KpiCard
          etiqueta="Inactivos"
          valor={formatNumero(padron.filter((p) => !p.activo).length)}
        />
      </KpiRow>

      <BarraFiltros
        envolver
        derecha={
          <>
            <SelectorPill
              etiqueta="Filtrar por plaza"
              valor={filtro.plazaId}
              opciones={[
                { valor: TODOS, etiqueta: "Todas las plazas" },
                ...opcionesPlaza,
              ]}
              onChange={(plazaId) => setFiltro((f) => ({ ...f, plazaId }))}
            />
            <SelectorPill
              etiqueta="Filtrar por estatus"
              valor={filtro.activo}
              opciones={[
                { valor: TODOS, etiqueta: "Activos e inactivos" },
                { valor: "ACTIVOS", etiqueta: "Solo activos" },
                { valor: "INACTIVOS", etiqueta: "Solo inactivos" },
              ]}
              onChange={(activo) =>
                setFiltro((f) => ({ ...f, activo: activo as FiltroActivo }))
              }
            />
          </>
        }
      >
        <PillsFiltro<Tipo>
          etiqueta="Filtrar por tipo"
          valor={filtro.tipo}
          opciones={[
            { valor: TODOS, etiqueta: "Todos" },
            { valor: "MANTENIMIENTO", etiqueta: "Mantenimiento" },
            { valor: "OBRA", etiqueta: "Obra" },
          ]}
          onChange={(tipo) => setFiltro((f) => ({ ...f, tipo, especialidad: TODOS }))}
        />
        {opcionesEspecialidad.length > 0 ? (
          <SelectorPill
            etiqueta={
              filtro.tipo === "OBRA" ? "Filtrar por partida" : "Filtrar por categoría"
            }
            valor={filtro.especialidad}
            opciones={[
              {
                valor: TODOS,
                etiqueta:
                  filtro.tipo === "OBRA" ? "Todas las partidas" : "Todas las categorías",
              },
              ...opcionesEspecialidad,
            ]}
            onChange={(especialidad) => setFiltro((f) => ({ ...f, especialidad }))}
          />
        ) : null}
      </BarraFiltros>

      <SectionCard sinPadding>
        <DataTable
          columns={columnas}
          data={visibles}
          tamanoPagina={15}
          ocultarEnVertical={["especialidades", "contacto"]}
          onFilaClick={(p) => router.push(`/proveedores/${p.id}`)}
          vacio={
            <EmptyState
              icono={Building2}
              titulo="Ningún proveedor coincide"
              descripcion="Cambia el tipo, la especialidad, la plaza o el estatus."
            />
          }
        />
      </SectionCard>

      {puedeGestionar ? (
        <>
          <DialogoProveedor
            abierto={creando}
            onCambioAbierto={setCreando}
            onGuardado={(id) => router.push(`/proveedores/${id}`)}
          />
          {editando ? (
            <DialogoProveedor
              abierto={editarAbierto}
              onCambioAbierto={setEditarAbierto}
              proveedor={editando}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
