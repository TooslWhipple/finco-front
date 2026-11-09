"use client";

import { cn } from "@/lib/utils";
import { CornerUpLeft, Save } from "lucide-react";
import { SegmentedControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  heredarRegla,
  origenRegla,
  type CuandoAplica,
  type ModoRegla,
  type OrigenRegla,
  type ReglaActualizacion,
  type TipoRegla,
} from "@/domain";
import { describirIncremento } from "@/features/plaza/resumen";
import { reglaConTipo, reglasIguales } from "./calculos";

const TIPOS = [
  { valor: "INPC", etiqueta: "INPC" },
  { valor: "INPC_PTS", etiqueta: "INPC + pts" },
  { valor: "VALOR_FIJO", etiqueta: "Fijo" },
] as const satisfies readonly { valor: TipoRegla; etiqueta: string }[];

const CUANDO = [
  { valor: "ENERO", etiqueta: "Cada 1 de enero" },
  { valor: "ANIVERSARIO", etiqueta: "Aniversario del contrato" },
] as const satisfies readonly { valor: CuandoAplica; etiqueta: string }[];

const MODOS = [
  { valor: "AUTOMATICO", etiqueta: "Automático" },
  { valor: "SEMIAUTOMATICO", etiqueta: "Semiautomático (bandeja)" },
] as const satisfies readonly { valor: ModoRegla; etiqueta: string }[];

const ETIQUETA_CUANDO: Record<CuandoAplica, string> = {
  ENERO: "Cada 1 de enero",
  ANIVERSARIO: "Aniversario del contrato",
};

const ETIQUETA_MODO: Record<ModoRegla, string> = {
  AUTOMATICO: "Automático",
  SEMIAUTOMATICO: "Semiautomático (bandeja)",
};

const NOTA_CUANDO = "Locales libres: 1 de enero · Rentados: aniversario";

const NOTA_MODO: Record<ModoRegla, string> = {
  AUTOMATICO: "El precio se actualiza solo cuando la regla aplica",
  SEMIAUTOMATICO: 'Cada cambio espera la "palomita" del responsable',
};

const ORIGEN: Record<OrigenRegla, { etiqueta: string; punto: string }> = {
  HEREDADA: { etiqueta: "Hereda de la plaza", punto: "bg-brand-secondary" },
  PERSONALIZADA: { etiqueta: "Personalizada", punto: "bg-brand-cta" },
  SIN_DEFAULT: {
    etiqueta: "Regla propia (la plaza no tiene default)",
    punto: "bg-brand-text-muted",
  },
};

interface EditorReglaProps {
  /** Regla efectiva: la guardada o el borrador en edición. */
  regla: ReglaActualizacion;
  reglaGuardada: ReglaActualizacion;
  reglaPlaza: ReglaActualizacion | undefined;
  /** Sin origen (p. ej. el default de una plaza) no se pinta el indicador. */
  origen?: OrigenRegla;
  editable: boolean;
  onCambiar: (regla: ReglaActualizacion) => void;
  onGuardar: () => void;
  onDescartar: () => void;
}

/** Fila "etiqueta a la izquierda, control y nota a la derecha". */
function Fila({
  etiqueta,
  children,
  nota,
  sinEnvolver = false,
}: {
  etiqueta: string;
  children: React.ReactNode;
  nota?: string;
  /** Mantiene los controles en una sola línea. */
  sinEnvolver?: boolean;
}) {
  return (
    <div className="grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <p className="text-sm text-brand-text-muted">{etiqueta}</p>
      <div
        className={cn(
          "flex items-center gap-x-3 gap-y-1.5",
          sinEnvolver ? "flex-nowrap" : "flex-wrap",
        )}
      >
        {children}
        {nota ? <p className="text-xs text-brand-text-muted">{nota}</p> : null}
      </div>
    </div>
  );
}

/**
 * Regla de actualización del local: tres filas (tipo, cuándo, modo). Se
 * incrusta en la card "Precio y candados"; no trae contenedor propio.
 */
export function EditorRegla({
  regla,
  reglaGuardada,
  reglaPlaza,
  origen,
  editable,
  onCambiar,
  onGuardar,
  onDescartar,
}: EditorReglaProps) {
  const estilo = origen ? ORIGEN[origen] : null;
  const sinCambios = reglasIguales(regla, reglaGuardada);

  const leerNumero = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.valueAsNumber;
    return Number.isNaN(n) ? 0 : Math.min(Math.max(n, 0), 50);
  };

  if (!editable) {
    return (
      <div className="grid gap-3">
        <Fila etiqueta="Regla de actualización" sinEnvolver>
          <p className="text-sm font-medium">{describirIncremento(reglaGuardada)}</p>
        </Fila>
        <Fila etiqueta="Cuándo aplica" nota={NOTA_CUANDO}>
          <p className="text-sm font-medium">{ETIQUETA_CUANDO[reglaGuardada.cuando]}</p>
        </Fila>
        <Fila etiqueta="Modo" nota={NOTA_MODO[reglaGuardada.modo]}>
          <p className="text-sm font-medium">{ETIQUETA_MODO[reglaGuardada.modo]}</p>
        </Fila>
        <p className="text-xs text-brand-text-muted">
          Solo la PMO puede cambiar la regla del local.
          {reglaPlaza ? ` Default de la plaza: ${describirIncremento(reglaPlaza)}.` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <Fila etiqueta="Regla de actualización" sinEnvolver>
        <SegmentedControl
          variante="suave"
          etiqueta="Tipo de regla"
          opciones={TIPOS}
          valor={regla.tipo}
          onChange={(tipo) => onCambiar(reglaConTipo(regla, tipo))}
        />
        {regla.tipo === "INPC_PTS" ? (
          <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-line bg-card px-2.5 py-1.5 text-sm font-medium whitespace-nowrap">
            <span aria-hidden>+</span>
            <Input
              type="number"
              min={0}
              max={50}
              step={0.5}
              aria-label="Puntos sobre INPC"
              value={regla.puntos ?? 0}
              onChange={(e) => onCambiar({ ...regla, puntos: leerNumero(e) })}
              className="h-6 w-16 border-0 px-1 py-0 text-center shadow-none"
            />
            <span>pts</span>
          </label>
        ) : null}
        {regla.tipo === "VALOR_FIJO" ? (
          <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-line bg-card px-2.5 py-1.5 text-sm font-medium whitespace-nowrap">
            <Input
              type="number"
              min={0}
              max={50}
              step={0.5}
              aria-label="Incremento anual fijo (%)"
              value={regla.porcentajeFijo ?? 0}
              onChange={(e) => onCambiar({ ...regla, porcentajeFijo: leerNumero(e) })}
              className="h-6 w-16 border-0 px-1 py-0 text-center shadow-none"
            />
            <span>% anual</span>
          </label>
        ) : null}
      </Fila>
      <Fila etiqueta="Cuándo aplica" nota={NOTA_CUANDO}>
        <SegmentedControl
          variante="suave"
          etiqueta="Cuándo aplica"
          opciones={CUANDO}
          valor={regla.cuando}
          onChange={(cuando) => onCambiar({ ...regla, cuando })}
        />
      </Fila>
      <Fila etiqueta="Modo" nota={NOTA_MODO[regla.modo]}>
        <SegmentedControl
          variante="suave"
          etiqueta="Modo"
          opciones={MODOS}
          valor={regla.modo}
          onChange={(modo) => onCambiar({ ...regla, modo })}
        />
      </Fila>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-brand-text-muted">
        {estilo ? (
          <span className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${estilo.punto}`} aria-hidden />
            {estilo.etiqueta}
          </span>
        ) : null}
        {!sinCambios ? (
          <>
            <span className="text-brand-cta">
              Cambios sin guardar: la gráfica muestra la vista previa.
            </span>
            <Button size="sm" onClick={onGuardar}>
              <Save aria-hidden />
              Guardar regla
            </Button>
            <Button size="sm" variant="outline" onClick={onDescartar}>
              Descartar cambios
            </Button>
          </>
        ) : null}
        {reglaPlaza && origenRegla(regla, reglaPlaza) === "PERSONALIZADA" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCambiar(heredarRegla(regla, reglaPlaza))}
          >
            <CornerUpLeft aria-hidden />
            Heredar de la plaza
          </Button>
        ) : null}
      </div>
    </div>
  );
}
