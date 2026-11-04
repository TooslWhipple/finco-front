"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import type { ReglaActualizacion, Rol, Usuario } from "@/domain";
import {
  DataTable,
  PageHeader,
  SectionCard,
  SegmentedControl,
  SelectorPill,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can, PERMISOS } from "@/config/permissions";
import { ETIQUETA_ROL } from "@/config/usuarios";
import { reglasIguales } from "@/features/local/calculos";
import { EditorRegla } from "@/features/local/editor-regla";
import { useParametros, usePlazas, useSesion, useUsuarios } from "@/hooks";
import { formatNumero, formatPorcentaje } from "@/lib/format";
import { useAppStore, VERSION_STORAGE } from "@/store";
import { matrizPermisos, type FilaMatriz } from "./calculos";

type Pestana = "USUARIOS" | "REGLAS" | "PARAMETROS" | "DEMO";

const PESTANAS = [
  { valor: "USUARIOS", etiqueta: "Usuarios y roles" },
  { valor: "REGLAS", etiqueta: "Reglas por default" },
  { valor: "PARAMETROS", etiqueta: "Parámetros" },
  { valor: "DEMO", etiqueta: "Demo" },
] as const satisfies readonly { valor: Pestana; etiqueta: string }[];

const ROLES = Object.keys(PERMISOS) as Rol[];

function Permiso({ permitido, rol }: { permitido: boolean; rol: Rol }) {
  return permitido ? (
    <Check
      className="mx-auto size-4 text-brand-secondary"
      aria-label={`${ETIQUETA_ROL[rol]} puede`}
    />
  ) : (
    <span className="text-brand-text-muted" aria-label={`${ETIQUETA_ROL[rol]} no puede`}>
      —
    </span>
  );
}

function UsuariosYRoles() {
  const usuarios = useUsuarios().datos;

  const columnasUsuarios = useMemo<ColumnDef<Usuario>[]>(
    () => [
      { id: "nombre", header: "Usuario", accessorFn: (u) => u.nombre },
      { id: "cargo", header: "Cargo", accessorFn: (u) => u.cargo },
      {
        id: "rol",
        header: "Rol",
        accessorFn: (u) => ETIQUETA_ROL[u.rol],
      },
      {
        id: "acciones",
        header: "Acciones permitidas",
        accessorFn: (u) => PERMISOS[u.rol].length,
        cell: ({ row }) => formatNumero(PERMISOS[row.original.rol].length),
      },
    ],
    [],
  );

  const filas = useMemo(() => matrizPermisos(ROLES), []);
  const columnasMatriz = useMemo<ColumnDef<FilaMatriz>[]>(
    () => [
      { id: "modulo", header: "Módulo", accessorFn: (f) => f.modulo },
      { id: "accion", header: "Acción", accessorFn: (f) => f.etiqueta },
      ...ROLES.map<ColumnDef<FilaMatriz>>((rol) => ({
        id: rol,
        header: ETIQUETA_ROL[rol],
        enableSorting: false,
        accessorFn: (f) => f.permitido[rol],
        cell: ({ row }) => <Permiso permitido={row.original.permitido[rol]} rol={rol} />,
      })),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <SectionCard titulo="Usuarios demo" sinPadding>
        <DataTable columns={columnasUsuarios} data={usuarios ?? []} />
      </SectionCard>
      <SectionCard titulo="Matriz de permisos (rol × acción)" sinPadding>
        <DataTable columns={columnasMatriz} data={filas} />
      </SectionCard>
      <p className="text-xs text-brand-text-muted">
        Todos los roles consultan todas las pantallas; los permisos limitan las acciones.
        La matriz es de solo lectura y se genera desde la configuración de permisos.
      </p>
    </div>
  );
}

function ReglasPorDefault() {
  const { rol } = useSesion();
  const plazas = usePlazas().datos;
  const establecer = useAppStore((s) => s.establecerReglaDefault);
  const [plazaId, setPlazaId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<ReglaActualizacion | null>(null);

  const conDefault = useMemo(
    () => (plazas ?? []).filter((p) => p.reglaDefault),
    [plazas],
  );
  const plaza = conDefault.find((p) => p.id === plazaId) ?? conDefault[0];
  const guardada = plaza?.reglaDefault;
  if (!plaza || !guardada) return null;

  const regla = borrador ?? guardada;
  const editable = can(rol, "configuracion.editar");

  const elegirPlaza = (id: string) => {
    setPlazaId(id);
    setBorrador(null);
  };

  const guardar = () => {
    if (!borrador || reglasIguales(borrador, guardada)) return;
    establecer(plaza.id, borrador);
    setBorrador(null);
    toast.success(`Regla por default de ${plaza.nombre} actualizada`);
  };

  return (
    <SectionCard
      titulo="Regla de actualización por default"
      extra={
        <SelectorPill
          etiqueta="Plaza"
          valor={plaza.id}
          opciones={conDefault.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
          onChange={elegirPlaza}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-brand-text-muted">
          Los locales que heredan la regla de la plaza y las cotizaciones y propuestas
          nuevas usan este default.
        </p>
        <EditorRegla
          regla={regla}
          reglaGuardada={guardada}
          reglaPlaza={undefined}
          editable={editable}
          onCambiar={setBorrador}
          onGuardar={guardar}
          onDescartar={() => setBorrador(null)}
        />
      </div>
    </SectionCard>
  );
}

function Parametros() {
  const parametros = useParametros().datos;
  if (!parametros) return null;

  const inpc = Object.entries(parametros.inpcAnual);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard titulo="INPC anual">
        <dl className="divide-y divide-brand-line text-sm">
          {inpc.map(([anio, valor]) => (
            <div key={anio} className="flex justify-between py-2">
              <dt className="text-brand-text-muted">{anio}</dt>
              <dd className="font-medium tabular-nums">{valor.toFixed(2)}%</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
      <SectionCard titulo="Reglas operativas">
        <dl className="divide-y divide-brand-line text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-brand-text-muted">Horas de apartado de un local</dt>
            <dd className="font-medium tabular-nums">{parametros.horasApartado} h</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-brand-text-muted">Ocupación alta (desde)</dt>
            <dd className="font-medium tabular-nums">
              {formatPorcentaje(parametros.umbralOcupacionAlta)}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-brand-text-muted">Ocupación media (desde)</dt>
            <dd className="font-medium tabular-nums">
              {formatPorcentaje(parametros.umbralOcupacionMedia)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-brand-text-muted">
          Parámetros de solo lectura en el prototipo.
        </p>
      </SectionCard>
    </div>
  );
}

function Demo() {
  const resetDemo = useAppStore((s) => s.resetDemo);
  return (
    <SectionCard titulo="Datos de la demo">
      <div className="space-y-4">
        <p className="text-sm text-brand-text-muted">
          Todo lo que se haga en la demo vive en este navegador. Al reiniciar, los datos
          vuelven al estado inicial y se conserva tu sesión.
        </p>
        <p className="text-sm">
          Versión de datos:{" "}
          <span className="font-medium tabular-nums">v{VERSION_STORAGE}</span>
        </p>
        <Button
          variant="outline"
          onClick={() => {
            resetDemo();
            toast.success("Demo reiniciada al estado inicial");
          }}
        >
          <RotateCcw aria-hidden />
          Reiniciar demo
        </Button>
      </div>
    </SectionCard>
  );
}

export function Configuracion() {
  const { rol } = useSesion();
  const [pestana, setPestana] = useState<Pestana>("USUARIOS");

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Configuración"
        descripcion="Usuarios y permisos, reglas por default, parámetros del sistema y datos de la demo."
      />
      {!can(rol, "configuracion.editar") ? (
        <p className="rounded-lg bg-brand-cream px-4 py-2.5 text-sm text-brand-text-muted ring-1 ring-brand-line">
          Vista de solo lectura. Solo Superadmin edita la configuración.
        </p>
      ) : null}
      <SegmentedControl
        etiqueta="Sección de configuración"
        opciones={PESTANAS}
        valor={pestana}
        onChange={setPestana}
      />
      {pestana === "USUARIOS" ? <UsuariosYRoles /> : null}
      {pestana === "REGLAS" ? <ReglasPorDefault /> : null}
      {pestana === "PARAMETROS" ? <Parametros /> : null}
      {pestana === "DEMO" ? <Demo /> : null}
    </div>
  );
}
