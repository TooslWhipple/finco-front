"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { Cotizacion, Local, Plaza } from "@/domain";
import { describirIncremento } from "@/features/plaza/resumen";
import { formatMoneda, formatPorcentaje } from "@/lib/format";
import { Campo, CampoLectura, CLASE_INPUT_EN_CAJA, EntradaConAdornos } from "./campo";
import type { TerminosFormulario } from "./esquemas";

interface FormularioTerminosProps {
  form: UseFormReturn<TerminosFormulario>;
  deshabilitado: boolean;
  cotizacion: Cotizacion;
  local: Local;
  plaza: Plaza;
  /** Aviso en línea cuando la renta queda bajo el mínimo y no hay excepción. */
  errorMinimo?: string;
}

function descuentoSobreLista(renta: number, lista: number): string {
  if (!Number.isFinite(renta) || lista <= 0 || renta === lista) return "sin descuento";
  return renta < lista
    ? `descuento ${formatPorcentaje((lista - renta) / lista)}`
    : `${formatPorcentaje((renta - lista) / lista)} sobre lista`;
}

/** Campos de la cotización oficial: los editables de Ventas y los que vienen del sistema. */
export function FormularioTerminos({
  form,
  deshabilitado,
  cotizacion,
  local,
  plaza,
  errorMinimo,
}: FormularioTerminosProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const numero = { valueAsNumber: true } as const;
  const renta = watch("rentaMensual");
  const depositoMeses = watch("depositoMeses");
  const mesesGracia = watch("mesesGracia");
  const monto = (meses: number) =>
    Number.isFinite(renta) && Number.isFinite(meses) ? formatMoneda(renta * meses) : "—";
  const errorRenta = errors.rentaMensual?.message ?? errorMinimo;

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
      <CampoLectura
        etiqueta="Prospecto / razón social"
        valor={cotizacion.prospecto.nombre}
      />
      <CampoLectura
        etiqueta="Giro"
        valor={cotizacion.giro ?? local.giro ?? "Por definir"}
      />
      <CampoLectura
        etiqueta="Plaza y local"
        valor={`${plaza.nombre} · ${local.codigo} · ${local.areaM2} m²`}
        bloqueado
      />
      <Campo
        etiqueta="Plazo e inicio"
        htmlFor="plazo"
        error={errors.plazoMeses?.message ?? errors.inicioContrato?.message}
      >
        <EntradaConAdornos invalido={Boolean(errors.plazoMeses)}>
          <Input
            id="plazo"
            type="number"
            inputMode="numeric"
            min={1}
            disabled={deshabilitado}
            aria-invalid={errors.plazoMeses ? true : undefined}
            className={`${CLASE_INPUT_EN_CAJA} max-w-9 flex-none`}
            {...register("plazoMeses", numero)}
          />
          <span className="shrink-0 text-brand-text-muted">meses ·</span>
          <Input
            id="inicio"
            type="date"
            aria-label="Inicio del contrato"
            disabled={deshabilitado}
            aria-invalid={errors.inicioContrato ? true : undefined}
            className={`${CLASE_INPUT_EN_CAJA} min-w-28 text-[13px]`}
            {...register("inicioContrato")}
          />
        </EntradaConAdornos>
      </Campo>
      <Campo
        etiqueta="Renta mensual ofrecida"
        htmlFor="renta"
        error={errorRenta}
        className="[&_p[role=alert]]:text-brand-danger"
      >
        <EntradaConAdornos prefijo="$" sufijo="+ IVA" invalido={Boolean(errorRenta)}>
          <Input
            id="renta"
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            disabled={deshabilitado}
            aria-invalid={errorRenta ? true : undefined}
            className={CLASE_INPUT_EN_CAJA}
            {...register("rentaMensual", numero)}
          />
        </EntradaConAdornos>
      </Campo>
      <CampoLectura
        etiqueta="Precio de lista del local"
        valor={formatMoneda(local.precioVigente)}
        complemento={descuentoSobreLista(renta, local.precioVigente)}
        bloqueado
      />
      <Campo
        etiqueta="Depósito en garantía"
        htmlFor="deposito"
        error={errors.depositoMeses?.message}
      >
        <EntradaConAdornos
          sufijo={`${depositoMeses === 1 ? "mes" : "meses"} · ${monto(depositoMeses)}`}
          invalido={Boolean(errors.depositoMeses)}
        >
          <Input
            id="deposito"
            type="number"
            inputMode="numeric"
            min={0}
            disabled={deshabilitado}
            aria-invalid={errors.depositoMeses ? true : undefined}
            className={CLASE_INPUT_EN_CAJA}
            {...register("depositoMeses", numero)}
          />
        </EntradaConAdornos>
      </Campo>
      <Campo
        etiqueta="Meses de gracia"
        htmlFor="gracia"
        error={errors.mesesGracia?.message}
      >
        <EntradaConAdornos
          sufijo={mesesGracia === 1 ? "mes (adecuaciones)" : "meses (adecuaciones)"}
          invalido={Boolean(errors.mesesGracia)}
        >
          <Input
            id="gracia"
            type="number"
            inputMode="numeric"
            min={0}
            disabled={deshabilitado}
            aria-invalid={errors.mesesGracia ? true : undefined}
            className={CLASE_INPUT_EN_CAJA}
            {...register("mesesGracia", numero)}
          />
        </EntradaConAdornos>
      </Campo>
      <CampoLectura
        etiqueta="Incremento anual"
        valor={
          cotizacion.origenRegla === "HEREDADA"
            ? "Default de la plaza"
            : "Regla del local"
        }
        complemento={describirIncremento(cotizacion.reglaPactada)}
        bloqueado
      />
      <CampoLectura
        etiqueta="Fecha de facturación"
        valor="Día 1"
        complemento="aniversario del contrato"
      />
    </div>
  );
}
