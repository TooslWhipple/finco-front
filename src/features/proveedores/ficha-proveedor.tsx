"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Pencil } from "lucide-react";
import {
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  MoneyAmount,
  PageHeader,
  SectionCard,
  StatusChip,
} from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  ETIQUETA_CATEGORIA_MANTENIMIENTO,
  ETIQUETA_ESTATUS_MANTENIMIENTO,
  ETIQUETA_PARTIDA,
  historialProveedor,
  montoMantenimiento,
  type CategoriaMantenimiento,
  type ContratoDeProveedor,
  type LicitacionDeProveedor,
  type Mantenimiento,
  type MontoPor,
} from "@/domain";
import {
  useMantenimientos,
  usePlazas,
  useProveedores,
  useSesion,
  useTerrenos,
  useTodasLasLicitaciones,
  useTodosLosContratosObra,
} from "@/hooks";
import { formatFecha, formatMoneda, formatNumero } from "@/lib/format";
import { DialogoProveedor } from "./dialogo-proveedor";
import { especialidades } from "./proveedores";

type Nombres = (id: string) => string;

function columnasTrabajos(nombrePlaza: Nombres): ColumnDef<Mantenimiento>[] {
  return [
    {
      id: "folio",
      header: "Folio",
      accessorFn: (m) => m.folio,
      cell: ({ row }) => (
        <span className="block">
          <span className="block font-medium text-brand-primary">
            {row.original.folio}
          </span>
          <span className="block text-xs text-brand-text-muted">
            {row.original.titulo}
          </span>
        </span>
      ),
    },
    { id: "plaza", header: "Plaza", accessorFn: (m) => nombrePlaza(m.plazaId) },
    {
      id: "categoria",
      header: "Categoría",
      accessorFn: (m) => ETIQUETA_CATEGORIA_MANTENIMIENTO[m.categoria],
    },
    {
      id: "fecha",
      header: "Fecha",
      accessorFn: (m) => m.fechaFin ?? m.fechaProgramada,
      cell: ({ row }) =>
        formatFecha(row.original.fechaFin ?? row.original.fechaProgramada),
    },
    {
      id: "estatus",
      header: "Estatus",
      accessorFn: (m) => ETIQUETA_ESTATUS_MANTENIMIENTO[m.estatus],
      cell: ({ row }) => <StatusChip estatus={row.original.estatus} />,
    },
    {
      id: "monto",
      header: "Monto",
      accessorFn: montoMantenimiento,
      cell: ({ row }) => <MoneyAmount valor={montoMantenimiento(row.original)} />,
    },
  ];
}

function columnasCobrado<K extends string>(
  titulo: string,
  etiqueta: (clave: K) => string,
): ColumnDef<MontoPor<K>>[] {
  return [
    { id: "clave", header: titulo, accessorFn: (f) => etiqueta(f.clave) },
    {
      id: "monto",
      header: "Cobrado",
      accessorFn: (f) => f.monto,
      cell: ({ row }) => <MoneyAmount valor={row.original.monto} />,
    },
  ];
}

function columnasContratos(nombreTerreno: Nombres): ColumnDef<ContratoDeProveedor>[] {
  return [
    {
      id: "folio",
      header: "Contrato",
      accessorFn: (f) => f.contrato.folio,
      cell: ({ row }) => (
        <Link
          href={`/terrenos-y-proyectos/${row.original.contrato.terrenoId}`}
          className="font-medium text-brand-primary hover:underline"
        >
          {row.original.contrato.folio}
        </Link>
      ),
    },
    {
      id: "proyecto",
      header: "Proyecto",
      accessorFn: (f) => nombreTerreno(f.contrato.terrenoId),
    },
    {
      id: "partida",
      header: "Partida",
      accessorFn: (f) => ETIQUETA_PARTIDA[f.contrato.partida],
    },
    {
      id: "monto",
      header: "Monto contratado",
      accessorFn: (f) => f.monto,
      cell: ({ row }) => <MoneyAmount valor={row.original.monto} />,
    },
  ];
}

function columnasLicitaciones(
  nombreTerreno: Nombres,
): ColumnDef<LicitacionDeProveedor>[] {
  return [
    {
      id: "folio",
      header: "Licitación",
      accessorFn: (f) => f.licitacion.folio,
      cell: ({ row }) => (
        <Link
          href={`/terrenos-y-proyectos/${row.original.licitacion.terrenoId}`}
          className="font-medium text-brand-primary hover:underline"
        >
          {row.original.licitacion.folio}
        </Link>
      ),
    },
    {
      id: "proyecto",
      header: "Proyecto",
      accessorFn: (f) => nombreTerreno(f.licitacion.terrenoId),
    },
    {
      id: "partida",
      header: "Partida",
      accessorFn: (f) => ETIQUETA_PARTIDA[f.licitacion.partida],
    },
    {
      id: "resultado",
      header: "Resultado",
      accessorFn: (f) => (f.ganador ? "Ganó" : f.licitacion.estado),
      cell: ({ row }) => {
        const { ganador, licitacion } = row.original;
        if (ganador) return <StatusChip estatus="ADJUDICADA" etiqueta="Ganó" />;
        return licitacion.estado === "EN_CURSO" ? (
          <StatusChip estatus="EN_CURSO" />
        ) : (
          <StatusChip estatus="DESCARTADO" etiqueta="No ganó" />
        );
      },
    },
  ];
}

/** Ficha del proveedor: historial de mantenimiento, lo cobrado y su paso por obra. */
export function FichaProveedor({ proveedorId }: { proveedorId: string }) {
  const { rol } = useSesion();
  const proveedor = useProveedores().find((p) => p.id === proveedorId);
  const mantenimientos = useMantenimientos().datos;
  const contratos = useTodosLosContratosObra();
  const licitaciones = useTodasLasLicitaciones();
  const plazas = usePlazas().datos;
  const terrenos = useTerrenos().datos;
  const [editando, setEditando] = useState(false);

  const historial = useMemo(
    () => historialProveedor(proveedorId, mantenimientos, contratos, licitaciones),
    [proveedorId, mantenimientos, contratos, licitaciones],
  );
  const columnas = useMemo(() => {
    const plazaPorId = new Map(plazas?.map((p) => [p.id, p.nombre]));
    const terrenoPorId = new Map(terrenos.map((t) => [t.id, t.nombre]));
    const nombrePlaza = (id: string) => plazaPorId.get(id) ?? id;
    const nombreTerreno = (id: string) => terrenoPorId.get(id) ?? id;
    return {
      nombrePlaza,
      trabajos: columnasTrabajos(nombrePlaza),
      porPlaza: columnasCobrado<string>("Plaza", (nombre) => nombre),
      porCategoria: columnasCobrado<CategoriaMantenimiento>(
        "Categoría",
        (c) => ETIQUETA_CATEGORIA_MANTENIMIENTO[c],
      ),
      contratos: columnasContratos(nombreTerreno),
      licitaciones: columnasLicitaciones(nombreTerreno),
    };
  }, [plazas, terrenos]);

  // TanStack cachea el valor de cada celda por fila mientras `data` conserve su identidad:
  // el nombre se resuelve en los datos para que se actualice cuando cargan las plazas.
  const plazasListas = plazas !== undefined;
  const cobradoPorPlaza = useMemo(
    () =>
      historial.cobradoPorPlaza.map((f) => ({
        clave: columnas.nombrePlaza(f.clave),
        monto: f.monto,
      })),
    [historial, columnas],
  );

  if (!proveedor) {
    return (
      <SectionCard>
        <EmptyState
          icono={Building2}
          titulo="No encontramos este proveedor"
          descripcion={`El proveedor ${proveedorId} no está en el padrón de la demo actual. Pudo borrarse al reiniciarla.`}
          accion={
            <Link href="/proveedores" className={buttonVariants({ variant: "outline" })}>
              Ver proveedores
            </Link>
          }
        />
      </SectionCard>
    );
  }

  const trabajos = [...historial.trabajos].sort((a, b) =>
    (b.fechaFin ?? b.fechaProgramada).localeCompare(a.fechaFin ?? a.fechaProgramada),
  );
  const contratado = historial.contratos.reduce((suma, c) => suma + c.monto, 0);
  const { contacto } = proveedor;
  const datosContacto = [contacto.nombre, contacto.correo, contacto.whatsapp].filter(
    (d) => d !== "",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={proveedor.nombre}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusChip estatus={proveedor.activo ? "ACTIVO" : "INACTIVO"} />
            <span>RFC {proveedor.rfc}</span>
            <span>
              {datosContacto.length > 0 ? datosContacto.join(" · ") : "Sin contacto"}
            </span>
          </span>
        }
        acciones={
          can(rol, "proveedores.gestionar") ? (
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil aria-hidden />
              Editar
            </Button>
          ) : undefined
        }
      />
      <p className="text-sm text-brand-text-muted">
        {especialidades(proveedor) || "Sin especialidades registradas"} · atiende{" "}
        {formatNumero(proveedor.plazaIds.length)} plazas en mantenimiento
      </p>

      <KpiRow>
        <KpiCard
          etiqueta="Cobrado en mantenimiento"
          valor={formatMoneda(historial.cobrado)}
          subtexto={`${formatNumero(historial.finalizados)} trabajos finalizados`}
        />
        <KpiCard
          etiqueta="Trabajos de mantenimiento"
          valor={formatNumero(historial.trabajos.length)}
          subtexto="En cualquier estatus"
        />
        <KpiCard
          etiqueta="Contratado en obra"
          valor={formatMoneda(contratado)}
          subtexto={`${formatNumero(historial.contratos.length)} contratos`}
        />
        <KpiCard
          etiqueta="Licitaciones"
          valor={formatNumero(historial.licitaciones.length)}
          subtexto={`${formatNumero(historial.licitaciones.filter((l) => l.ganador).length)} ganadas`}
        />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard titulo="Cobrado por plaza" sinPadding>
          <DataTable
            columns={columnas.porPlaza}
            data={plazasListas ? cobradoPorPlaza : []}
            tamanoPagina={8}
            vacio={
              <SinDatos
                texto={
                  plazasListas ? "Aún no hay trabajos finalizados." : "Cargando plazas…"
                }
              />
            }
          />
        </SectionCard>
        <SectionCard titulo="Cobrado por categoría" sinPadding>
          <DataTable
            columns={columnas.porCategoria}
            data={historial.cobradoPorCategoria}
            vacio={<SinDatos texto="Aún no hay trabajos finalizados." />}
          />
        </SectionCard>
      </div>

      <SectionCard titulo={`Historial de mantenimientos (${trabajos.length})`} sinPadding>
        <DataTable
          columns={columnas.trabajos}
          data={plazasListas ? trabajos : []}
          tamanoPagina={10}
          ocultarEnVertical={["categoria"]}
          vacio={
            <SinDatos
              texto={
                plazasListas
                  ? "Este proveedor no tiene trabajos de mantenimiento."
                  : "Cargando plazas…"
              }
            />
          }
        />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          titulo={`Contratos de obra (${historial.contratos.length})`}
          extra="Monto contratado, aparte de lo cobrado"
          sinPadding
        >
          <DataTable
            columns={columnas.contratos}
            data={historial.contratos}
            vacio={<SinDatos texto="Sin contratos de obra." />}
          />
        </SectionCard>
        <SectionCard
          titulo={`Licitaciones (${historial.licitaciones.length})`}
          extra="Invitado o ganador"
          sinPadding
        >
          <DataTable
            columns={columnas.licitaciones}
            data={historial.licitaciones}
            vacio={<SinDatos texto="No ha sido invitado a licitar." />}
          />
        </SectionCard>
      </div>

      {can(rol, "proveedores.gestionar") ? (
        <DialogoProveedor
          abierto={editando}
          onCambioAbierto={setEditando}
          proveedor={proveedor}
        />
      ) : null}
    </div>
  );
}

function SinDatos({ texto }: { texto: string }) {
  return <p className="px-5 py-6 text-center text-sm text-brand-text-muted">{texto}</p>;
}
