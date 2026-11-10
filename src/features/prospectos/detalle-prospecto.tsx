"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PanelDetalle, StatusChip, Timeline } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DEMO_TODAY,
  diasSinContacto,
  temperaturaProspecto,
  type TipoContactoProspecto,
  ETIQUETA_ETAPA_PROSPECTO,
  ETIQUETA_ORIGEN_PROSPECTO,
  prospectoActivo,
  siguienteEtapaProspecto,
  type Cotizacion,
  type Local,
  type Plaza,
  type Prospecto,
} from "@/domain";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DialogoMarcarPerdido, DialogoRegistrarContacto } from "./dialogos-prospecto";
import { textoDiasSinContacto } from "./agregados";

interface DetalleProspectoProps {
  prospecto: Prospecto;
  locales: ReadonlyMap<string, Local>;
  plazas: ReadonlyMap<string, Plaza>;
  cotizaciones: readonly Cotizacion[];
  puedeGestionar: boolean;
  puedeCotizar: boolean;
  onAvanzar: (id: string) => void;
  onRegistrarContacto: (
    id: string,
    contacto: { tipo: TipoContactoProspecto; nota: string },
  ) => void;
  onMarcarPerdido: (id: string, motivo: string) => void;
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

function FilaCandado({
  nombre,
  cumple,
  detalle,
}: {
  nombre: string;
  cumple: boolean;
  detalle: string;
}) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium">{nombre}</p>
        <p className="text-xs text-brand-text-muted">{detalle}</p>
      </div>
      <StatusChip estatus={cumple ? "CUMPLE" : "FALLA"} />
    </li>
  );
}

/** Panel lateral del prospecto: ficha, locales, expediente, cotizaciones y actividad. */
export function DetalleProspecto({
  prospecto: p,
  locales,
  plazas,
  cotizaciones,
  puedeGestionar,
  puedeCotizar,
  onAvanzar,
  onRegistrarContacto,
  onMarcarPerdido,
  onCerrar,
  className,
}: DetalleProspectoProps) {
  const [contactando, setContactando] = useState(false);
  const [perdiendo, setPerdiendo] = useState(false);
  const dias = diasSinContacto(p, DEMO_TODAY);
  const temperatura = temperaturaProspecto(dias);
  const siguiente = siguienteEtapaProspecto(p.etapa);
  const interes = p.localIds.flatMap((id) => {
    const local = locales.get(id);
    return local ? [{ local, plaza: plazas.get(local.plazaId) }] : [];
  });
  const ligadas = cotizaciones.filter((c) => c.prospectoId === p.id);
  // Una cotización solo se abre sobre un local que aún se pueda colocar.
  const cotizable = interes.find(
    ({ local }) => local.estatus === "DISPONIBLE" || local.estatus === "EN_COTIZACION",
  );

  return (
    <>
      <PanelDetalle
        className={className}
        titulo={p.nombre}
        subtitulo={p.giro}
        estado={<StatusChip estatus={p.etapa} />}
        onCerrar={onCerrar}
        secciones={[
          {
            titulo: "Datos fiscales y contacto",
            contenido: (
              <dl className="grid grid-cols-2 gap-3">
                <Dato etiqueta="RFC" valor={p.rfc} />
                <Dato etiqueta="Origen" valor={ETIQUETA_ORIGEN_PROSPECTO[p.origen]} />
                <Dato etiqueta="Contacto" valor={p.contacto.nombre} />
                <Dato etiqueta="Teléfono" valor={p.contacto.telefono} />
                <div className="col-span-2">
                  <Dato etiqueta="Correo" valor={p.contacto.correo} />
                </div>
                <Dato etiqueta="Alta" valor={formatFecha(p.creadoEl)} />
                <div>
                  <dt className="text-xs text-brand-text-muted">Último contacto</dt>
                  <dd className="flex flex-wrap items-center gap-2 font-medium">
                    {textoDiasSinContacto(dias)}
                    {temperatura ? <StatusChip estatus={temperatura} /> : null}
                  </dd>
                </div>
              </dl>
            ),
          },
          {
            titulo: "Locales de interés",
            contenido:
              interes.length === 0 ? (
                "Sin local asignado."
              ) : (
                <ul className="space-y-1">
                  {interes.map(({ local, plaza }) => (
                    <li key={local.id}>
                      <Link
                        href={`/plazas/${local.plazaId}/locales/${local.id}`}
                        className="font-medium text-brand-primary hover:underline"
                      >
                        {plaza?.nombre ?? local.plazaId} · Local {local.codigo}
                      </Link>
                    </li>
                  ))}
                </ul>
              ),
          },
          {
            titulo: "Expediente",
            contenido: (
              <ul className="space-y-3">
                <FilaCandado
                  nombre="Expediente del prospecto completo"
                  cumple={p.documentosCompletos}
                  detalle={
                    p.documentosCompletos
                      ? "Acta, RFC, identificación, comprobante."
                      : "Faltan documentos (acta, RFC, identificación, comprobante)."
                  }
                />
                <FilaCandado
                  nombre="Aval / fianza registrada"
                  cumple={Boolean(p.aval)}
                  detalle={p.aval ?? "No hay aval ni fianza registrada."}
                />
              </ul>
            ),
          },
          {
            titulo: "Cotizaciones",
            contenido:
              ligadas.length === 0 ? (
                "Aún no tiene cotizaciones."
              ) : (
                <ul className="space-y-1.5">
                  {ligadas.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <Link
                        href={`/cotizaciones/${c.id}`}
                        className="font-medium text-brand-primary hover:underline"
                      >
                        {c.id}
                      </Link>
                      <StatusChip estatus={c.estado} />
                    </li>
                  ))}
                </ul>
              ),
          },
          {
            titulo: "Actividad",
            contenido: (
              <Timeline
                eventos={p.actividad.map((a) => ({
                  id: a.id,
                  titulo: a.titulo,
                  fecha: formatFecha(a.fecha),
                  tono: "indigo",
                }))}
              />
            ),
          },
        ]}
        acciones={
          puedeGestionar && prospectoActivo(p) ? (
            <>
              {siguiente ? (
                <Button
                  onClick={() => {
                    onAvanzar(p.id);
                    toast.success(
                      `${p.nombre} avanzó a ${ETIQUETA_ETAPA_PROSPECTO[siguiente]}`,
                    );
                  }}
                  className="min-h-11 bg-brand-cta text-white hover:bg-brand-cta-light"
                >
                  Avanzar a {ETIQUETA_ETAPA_PROSPECTO[siguiente]}
                </Button>
              ) : null}
              {puedeCotizar && cotizable ? (
                <Link
                  href={`/cotizaciones/nueva?local=${cotizable.local.id}&prospecto=${p.id}`}
                  className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
                >
                  Crear cotización
                </Link>
              ) : null}
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setContactando(true)}
              >
                Registrar contacto
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setPerdiendo(true)}
              >
                Marcar perdido
              </Button>
            </>
          ) : null
        }
      />
      <DialogoRegistrarContacto
        prospecto={p}
        abierto={contactando}
        onCambioAbierto={setContactando}
        onRegistrar={(contacto) => {
          onRegistrarContacto(p.id, contacto);
          toast.success(`Contacto con ${p.nombre} registrado`);
        }}
      />
      <DialogoMarcarPerdido
        prospecto={p}
        abierto={perdiendo}
        onCambioAbierto={setPerdiendo}
        onMarcar={(motivo) => {
          onMarcarPerdido(p.id, motivo);
          toast.info(`${p.nombre} se marcó como perdido`);
        }}
      />
    </>
  );
}
