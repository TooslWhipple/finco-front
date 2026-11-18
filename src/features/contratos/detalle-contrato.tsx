"use client";

import Link from "next/link";
import { toast } from "sonner";
import { PanelDetalle, StatusChip } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  contratoVigenteParaApertura,
  estadoVisibleContrato,
  type Contrato,
  type Cotizacion,
  type Local,
  type Plaza,
  type Prospecto,
} from "@/domain";
import { BotonLiberarLocal } from "@/features/local/boton-liberar-local";
import {
  BotonRegistrarApertura,
  ChipApertura,
} from "@/features/local/boton-registrar-apertura";
import { describirRegla } from "@/features/plaza/resumen";
import { formatFecha, formatMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { diasParaVencer } from "./agregados";
import { rutaContratoImprimible } from "./contrato-imprimible";
import { datosArrendatario } from "./render-contrato";

interface DetalleContratoProps {
  contrato: Contrato;
  hoy: string;
  /** Nombre del locatario (o del prospecto, si aún no se firma). */
  locatario: string;
  local?: Local;
  plaza?: Plaza;
  cotizacion?: Cotizacion;
  /** Prospecto del que nació el contrato (su `locatarioId`); ausente en los del seed. */
  prospecto?: Prospecto;
  /** El local del contrato está rentado y aún no abre (`localesSinAbrir`). */
  sinAbrir: boolean;
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
  prospecto,
  sinAbrir,
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
  const pendienteApertura = contratoVigenteParaApertura(c, hoy) && sinAbrir;
  const arrendatario = prospecto ? datosArrendatario(prospecto) : undefined;

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
        ...(arrendatario
          ? [
              {
                titulo: "Arrendatario",
                contenido: (
                  <dl className="grid grid-cols-2 gap-3">
                    <Dato etiqueta="RFC" valor={arrendatario.rfc} />
                    <Dato etiqueta="Tipo de persona" valor={arrendatario.tipoPersona} />
                    <Dato etiqueta="Contacto" valor={arrendatario.contacto.nombre} />
                    <Dato etiqueta="Teléfono" valor={arrendatario.contacto.telefono} />
                    <div className="col-span-2">
                      <Dato etiqueta="Correo" valor={arrendatario.contacto.correo} />
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-brand-text-muted">
                        Documentos entregados
                      </dt>
                      <dd className="font-medium">
                        {arrendatario.documentos.length === 0 ? (
                          "Ninguno."
                        ) : (
                          <ul className="space-y-0.5">
                            {arrendatario.documentos.map((d) => (
                              <li key={d.tipo}>
                                {d.etiqueta}
                                <span className="font-normal text-brand-text-muted">
                                  {" "}
                                  · {d.entregadoEl}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                  </dl>
                ),
              },
            ]
          : []),
        ...(pendienteApertura || c.apertura
          ? [
              {
                titulo: "Apertura",
                contenido: <ChipApertura contrato={c} sinAbrir={pendienteApertura} />,
              },
            ]
          : []),
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
        <>
          {local ? (
            <Link
              href={rutaContratoImprimible(folio)}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
            >
              Ver contrato
            </Link>
          ) : null}
          {renovable ? <BotonLiberarLocal local={local} contrato={c} /> : null}
          {pendienteApertura && local ? (
            <BotonRegistrarApertura local={local} contrato={c} />
          ) : null}
          {puedeGestionar ? (
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
          ) : null}
        </>
      }
    />
  );
}
