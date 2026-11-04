"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PanelDetalle, StatusChip } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  estadoVisibleContrato,
  type Contrato,
  type Cotizacion,
  type Local,
  type Plaza,
} from "@/domain";
import { describirRegla } from "@/features/plaza/resumen";
import { formatFecha, formatMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { diasParaVencer } from "./agregados";

interface DetalleContratoProps {
  contrato: Contrato;
  hoy: string;
  /** Nombre del locatario (o del prospecto, si aún no se firma). */
  locatario: string;
  local?: Local;
  plaza?: Plaza;
  cotizacion?: Cotizacion;
  puedeGestionar: boolean;
  onEnviarAFirma: (id: string) => void;
  onRegistrarFirma: (id: string) => void;
  onCerrar: () => void;
  className?: string;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-text-muted">{etiqueta}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  );
}

function textoDias(dias: number): string {
  if (dias < 0) return `Venció hace ${-dias} días`;
  return dias === 1 ? "Vence en 1 día" : `Vence en ${dias} días`;
}

/** Panel lateral del contrato: partes, vigencia, renta e incrementos, y acciones del ciclo de firma. */
export function DetalleContrato({
  contrato: c,
  hoy,
  locatario,
  local,
  plaza,
  cotizacion,
  puedeGestionar,
  onEnviarAFirma,
  onRegistrarFirma,
  onCerrar,
  className,
}: DetalleContratoProps) {
  const estado = estadoVisibleContrato(c, hoy);
  const rige = c.estado === "VIGENTE";
  const folio = c.folio ?? c.id;
  const renovable = rige && local !== undefined;

  return (
    <PanelDetalle
      className={className}
      titulo={folio}
      subtitulo={locatario}
      estado={<StatusChip estatus={estado} />}
      onCerrar={onCerrar}
      secciones={[
        {
          titulo: "Local",
          contenido: local ? (
            <Link
              href={`/plazas/${local.plazaId}/locales/${local.id}`}
              className="font-medium text-brand-primary hover:underline"
            >
              {plaza?.nombre ?? local.plazaId} · Local {local.codigo}
            </Link>
          ) : (
            "Local no disponible."
          ),
        },
        {
          titulo: "Vigencia",
          contenido: (
            <dl className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Inicio" valor={formatFecha(c.inicio)} />
              <Dato etiqueta="Fin" valor={formatFecha(c.fin)} />
              {rige ? (
                <div className="col-span-2">
                  <Dato
                    etiqueta="Estado de la vigencia"
                    valor={textoDias(diasParaVencer(c, hoy))}
                  />
                </div>
              ) : null}
            </dl>
          ),
        },
        {
          titulo: "Renta e incrementos",
          contenido: (
            <dl className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Renta mensual" valor={formatMoneda(c.rentaMensual)} />
              <Dato
                etiqueta="Incremento"
                valor={local ? describirRegla(local.regla) : "—"}
              />
            </dl>
          ),
        },
        {
          titulo: "Origen",
          contenido: cotizacion ? (
            <Link
              href={`/cotizaciones/${cotizacion.id}`}
              className="font-medium text-brand-primary hover:underline"
            >
              Cotización {cotizacion.id}
            </Link>
          ) : (
            "Contrato anterior al portal; sin cotización asociada."
          ),
        },
      ]}
      acciones={
        puedeGestionar ? (
          <>
            {c.estado === "BORRADOR" ? (
              <Button
                onClick={() => {
                  onEnviarAFirma(c.id);
                  toast.success(`${folio} enviado a firma`);
                }}
                className="bg-brand-cta text-white hover:bg-brand-cta-light"
              >
                Enviar a firma
              </Button>
            ) : null}
            {c.estado === "EN_FIRMA" ? (
              <Button
                onClick={() => {
                  onRegistrarFirma(c.id);
                  toast.success(`${folio} firmado: alta registrada en EnKontrol`);
                }}
                className="bg-brand-cta text-white hover:bg-brand-cta-light"
              >
                Registrar firma
              </Button>
            ) : null}
            {renovable ? (
              <Link
                href={`/cotizaciones/nueva?local=${c.localId}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Renovar
              </Link>
            ) : null}
          </>
        ) : null
      }
    />
  );
}
