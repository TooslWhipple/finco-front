"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarraProgreso, SectionCard, type TonoBarra } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { can } from "@/config/permissions";
import { Campo } from "@/features/cotizacion/campo";
import {
  consumoPresupuesto,
  DEMO_TODAY,
  disponiblePresupuesto,
  nivelPresupuesto,
  type NivelPresupuesto,
  type PresupuestoMantenimiento,
} from "@/domain";
import { useMantenimientos, usePresupuestosMantenimiento, useSesion } from "@/hooks";
import { formatMoneda, formatPorcentaje } from "@/lib/format";
import { useAppStore } from "@/store";
import type { ContextoMantenimiento } from "./contexto";

const AÑO_DEMO = Number(DEMO_TODAY.slice(0, 4));
/** Tarjetas visibles antes de "Ver todas": las más cargadas van primero. */
const TARJETAS_INICIALES = 6;

const TONO_NIVEL: Record<NivelPresupuesto, TonoBarra> = {
  NORMAL: "primario",
  ALERTA: "naranja",
  SOBREGIRO: "coral",
};

const TEXTO_NIVEL: Record<NivelPresupuesto, string | undefined> = {
  NORMAL: undefined,
  ALERTA: "Más del 80 % del presupuesto",
  SOBREGIRO: "Presupuesto sobregirado",
};

interface FilaPresupuesto {
  presupuesto: PresupuestoMantenimiento;
  consumo: number;
  nivel: NivelPresupuesto;
}

// --- edición (PMO) --------------------------------------------------------

function FormularioPresupuesto({
  nombrePlaza,
  fila,
  onCerrar,
}: {
  nombrePlaza: string;
  fila: FilaPresupuesto;
  onCerrar: () => void;
}) {
  const fijar = useAppStore((s) => s.fijarPresupuestoMantenimiento);
  const [texto, setTexto] = useState(String(fila.presupuesto.monto));
  const monto = Number(texto);
  const error =
    texto.trim() === "" || !Number.isFinite(monto) || monto < 0
      ? "Escribe el presupuesto en pesos (0 o más)."
      : undefined;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (error) return;
        fijar(fila.presupuesto.plazaId, fila.presupuesto.año, monto);
        toast.success(
          `Presupuesto ${fila.presupuesto.año} de ${nombrePlaza}: ${formatMoneda(Math.round(monto))}`,
        );
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Presupuesto de mantenimiento {fila.presupuesto.año}</DialogTitle>
        <DialogDescription>
          {nombrePlaza}. Ya hay {formatMoneda(fila.consumo)} comprometidos; el trabajo que
          rebase el nuevo monto esperará la autorización de Dirección.
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Monto anual (MXN)" htmlFor="presupuesto-monto" error={error}>
        <Input
          id="presupuesto-monto"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-invalid={error ? true : undefined}
          className="h-11 md:text-base"
        />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          disabled={error !== undefined}
          className="h-11 bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Guardar presupuesto
        </Button>
      </DialogFooter>
    </form>
  );
}

// --- tarjeta --------------------------------------------------------------

function TarjetaPresupuesto({
  nombrePlaza,
  fila,
  puedeEditar,
  onEditar,
}: {
  nombrePlaza: string;
  fila: FilaPresupuesto;
  puedeEditar: boolean;
  onEditar: () => void;
}) {
  const { presupuesto, consumo, nivel } = fila;
  const disponible = disponiblePresupuesto(presupuesto, consumo);
  const fraccion = presupuesto.monto > 0 ? consumo / presupuesto.monto : 1;
  const aviso = TEXTO_NIVEL[nivel];
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-brand-line bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-brand-primary">{nombrePlaza}</h3>
          <p className="text-xs text-brand-text-muted">Presupuesto {presupuesto.año}</p>
        </div>
        <span className="text-sm font-semibold text-brand-primary tabular-nums">
          {formatPorcentaje(fraccion)}
        </span>
      </header>
      <BarraProgreso
        valor={fraccion}
        tono={TONO_NIVEL[nivel]}
        etiqueta={`Consumo del presupuesto ${presupuesto.año} de ${nombrePlaza}`}
      />
      <p className="text-sm tabular-nums">
        {formatMoneda(consumo)}{" "}
        <span className="text-brand-text-muted">
          de {formatMoneda(presupuesto.monto)}
        </span>
      </p>
      <p
        className={
          disponible < 0
            ? "text-xs font-medium text-brand-danger"
            : "text-xs text-brand-text-muted"
        }
      >
        {disponible < 0
          ? `Sobregiro de ${formatMoneda(-disponible)}`
          : `Disponible ${formatMoneda(disponible)}`}
        {aviso && disponible >= 0 ? ` · ${aviso}` : null}
      </p>
      {puedeEditar ? (
        <Button
          variant="outline"
          className="mt-1 h-11 self-start"
          onClick={onEditar}
          aria-label={`Editar presupuesto de ${nombrePlaza}`}
        >
          Editar presupuesto
        </Button>
      ) : null}
    </article>
  );
}

// --- panel ----------------------------------------------------------------

interface PanelPresupuestosProps {
  contexto: ContextoMantenimiento;
  /** Acota a una plaza (filtro de la pantalla o ficha de la plaza). */
  plazaId?: string;
}

/**
 * Una tarjeta de presupuesto del año por plaza, con el consumo y su alerta. La PMO
 * (y el Superadmin) editan el monto desde aquí.
 */
export function PanelPresupuestos({ contexto, plazaId }: PanelPresupuestosProps) {
  const { rol } = useSesion();
  const presupuestos = usePresupuestosMantenimiento();
  const todos = useMantenimientos().datos;
  const [verTodas, setVerTodas] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const puedeEditar = can(rol, "mantenimiento.presupuestoEditar");

  const filas = useMemo<FilaPresupuesto[]>(
    () =>
      presupuestos
        .filter(
          (p) => p.año === AÑO_DEMO && (plazaId === undefined || p.plazaId === plazaId),
        )
        .map((presupuesto) => {
          const consumo = consumoPresupuesto(presupuesto.plazaId, presupuesto.año, todos);
          return { presupuesto, consumo, nivel: nivelPresupuesto(presupuesto, consumo) };
        })
        .sort(
          (a, b) =>
            b.consumo / Math.max(b.presupuesto.monto, 1) -
            a.consumo / Math.max(a.presupuesto.monto, 1),
        ),
    [presupuestos, todos, plazaId],
  );
  if (filas.length === 0) return null;

  const visibles = verTodas ? filas : filas.slice(0, TARJETAS_INICIALES);
  const enEdicion = filas.find((f) => f.presupuesto.plazaId === editando);
  return (
    <SectionCard
      titulo={`Presupuesto de mantenimiento ${AÑO_DEMO}`}
      extra={
        filas.length > TARJETAS_INICIALES ? (
          <Button
            variant="outline"
            className="h-11"
            aria-expanded={verTodas}
            onClick={() => setVerTodas((v) => !v)}
          >
            {verTodas ? "Ver menos" : `Ver todas (${filas.length})`}
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibles.map((fila) => (
          <TarjetaPresupuesto
            key={fila.presupuesto.plazaId}
            nombrePlaza={contexto.nombrePlaza(fila.presupuesto.plazaId)}
            fila={fila}
            puedeEditar={puedeEditar}
            onEditar={() => setEditando(fila.presupuesto.plazaId)}
          />
        ))}
      </div>
      {enEdicion ? (
        <Dialog open onOpenChange={(abierto) => !abierto && setEditando(null)}>
          <DialogContent>
            <FormularioPresupuesto
              nombrePlaza={contexto.nombrePlaza(enEdicion.presupuesto.plazaId)}
              fila={enEdicion}
              onCerrar={() => setEditando(null)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </SectionCard>
  );
}
