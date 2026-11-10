"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, FileDown, FileSearch, Lock, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  EmptyState,
  MoneyAmount,
  PageHeader,
  SectionCard,
  StatusChip,
} from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import { nombreDeUsuario } from "@/config/usuarios";
import {
  contratoDesbloqueado,
  DEMO_TODAY,
  evaluarCandados,
  folioContrato,
  sumarMeses,
  type Ciudad,
  type Cotizacion,
  type Local,
  type Plaza,
} from "@/domain";
import {
  useCiudades,
  useCotizacion,
  useExcepciones,
  useLocal,
  usePlaza,
  useSesion,
} from "@/hooks";
import { avisarProximaFase } from "@/lib/avisos";
import { formatFecha, formatMesAnio, formatMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  aplicarTerminos,
  construirActividad,
  derivarPasos,
  estadoVisible,
  excepcionAbierta,
  excepcionVigente,
  resumenEconomico,
  terminosDe,
  type Terminos,
} from "./calculos";
import { ActividadCotizacion } from "./actividad-cotizacion";
import { DialogoExcepcion } from "./dialogo-excepcion";
import { esquemaTerminos, type TerminosFormulario } from "./esquemas";
import { HistorialOfertas } from "./historial-ofertas";
import { FormularioTerminos } from "./formulario-terminos";
import { ListaCandados } from "./lista-candados";
import { PasosCotizacion } from "./pasos";
import { rutaContratoImprimible } from "@/features/contratos/contrato-imprimible";
import { VistaPreviaContrato } from "./vista-previa-contrato";

export function CotizacionDetalle({ folio }: { folio: string }) {
  const cotizacion = useCotizacion(folio);
  const local = useLocal(cotizacion?.localId ?? "");
  const plaza = usePlaza(local.datos?.plazaId ?? "");
  const ciudades = useCiudades();

  if (!cotizacion) {
    return (
      <SectionCard>
        <EmptyState
          icono={FileSearch}
          titulo="No encontramos esta cotización"
          descripcion={`El folio ${folio} no existe en la demo actual. Pudo borrarse al reiniciarla.`}
          accion={
            <Link href="/cotizaciones" className={buttonVariants({ variant: "outline" })}>
              Ver cotizaciones
            </Link>
          }
        />
      </SectionCard>
    );
  }
  if (!local.datos || !plaza.datos) {
    return <p className="text-sm text-brand-text-muted">Cargando cotización…</p>;
  }
  return (
    <EditorCotizacion
      key={cotizacion.id}
      cotizacion={cotizacion}
      local={local.datos}
      plaza={plaza.datos}
      ciudad={ciudades.datos?.find((c) => c.id === plaza.datos?.ciudadId)}
    />
  );
}

interface EditorProps {
  cotizacion: Cotizacion;
  local: Local;
  plaza: Plaza;
  ciudad?: Ciudad;
}

function EditorCotizacion({ cotizacion, local, plaza, ciudad }: EditorProps) {
  const { rol } = useSesion();
  const excepciones = useExcepciones();
  const actualizarCotizacion = useAppStore((s) => s.actualizarCotizacion);
  const solicitarExcepcion = useAppStore((s) => s.solicitarExcepcion);
  const router = useRouter();
  const generarContrato = useAppStore((s) => s.generarContrato);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const generado = cotizacion.estado === "CONTRATO_GENERADO";
  const editable = can(rol, "cotizaciones.crear") && !generado;

  const form = useForm<TerminosFormulario>({
    resolver: zodResolver(esquemaTerminos),
    defaultValues: terminosDe(cotizacion),
    mode: "onChange",
  });
  const valores = useWatch({ control: form.control });

  // Los candados se evalúan en vivo con lo capturado; si el formulario es
  // inválido se mantiene el último estado guardado.
  const parseo = esquemaTerminos.safeParse(valores);
  const terminos: Terminos = parseo.success ? parseo.data : terminosDe(cotizacion);
  const borrador = aplicarTerminos(cotizacion, terminos);
  const excepcion = excepcionVigente(excepciones, cotizacion.id, terminos.rentaMensual);
  const candados = evaluarCandados(borrador, local, DEMO_TODAY, excepcion);
  const desbloqueado = contratoDesbloqueado(candados);
  const abierta = excepcionAbierta(excepciones, cotizacion.id);
  const falloPrecio = candados.find((c) => c.id === "PRECIO_MINIMO")?.estado === "FALLA";
  const economico = resumenEconomico(terminos, local);
  const folioCtr = folioContrato(cotizacion.id);

  const pasos = derivarPasos({
    prospecto: cotizacion.prospecto.nombre.split(",")[0],
    prospectoHref: cotizacion.prospectoId
      ? `/prospectos?prospecto=${cotizacion.prospectoId}`
      : undefined,
    folioCotizacion: cotizacion.id,
    candados,
    excepcion: abierta ?? excepcion,
    contratoGenerado: generado,
    folioContrato: folioCtr,
  });
  const eventos = construirActividad(cotizacion, excepciones);

  const puedeSolicitar =
    editable && can(rol, "excepcion.solicitar") && falloPrecio && !abierta;
  const puedeGenerar = !generado && can(rol, "contrato.generar") && desbloqueado;
  const guardable = editable && form.formState.isDirty && form.formState.isValid;

  const guardar = form.handleSubmit((v) => {
    actualizarCotizacion(cotizacion.id, v);
    form.reset(v);
    toast.success("Cotización guardada");
  });

  const solicitar = (motivo: string) =>
    void form.handleSubmit((v) => {
      actualizarCotizacion(cotizacion.id, v);
      solicitarExcepcion(aplicarTerminos(cotizacion, v), local, motivo);
      form.reset(v);
      toast.success("Excepción solicitada", {
        description: "Dirección la verá en su campana y en Precios y reglas.",
      });
    })();

  const generar = form.handleSubmit((v) => {
    const evaluados = evaluarCandados(
      aplicarTerminos(cotizacion, v),
      local,
      DEMO_TODAY,
      excepcionVigente(excepciones, cotizacion.id, v.rentaMensual),
    );
    if (!contratoDesbloqueado(evaluados)) return;
    generarContrato(cotizacion.id, v);
    form.reset(v);
    toast.success(`Borrador ${folioCtr} generado`, {
      action: {
        label: "Ver contrato",
        onClick: () => router.push(rutaContratoImprimible(folioCtr)),
      },
    });
  });

  const estadoChip = <StatusChip {...estadoVisible(borrador, local, excepciones)} />;
  const mensajeMinimo =
    falloPrecio && !abierta
      ? `Está ${formatMoneda(-economico.diferenciaMinimo)} por debajo del mínimo autorizado (${formatMoneda(local.precioMinimo)}). El contrato no se puede generar.`
      : falloPrecio
        ? `Excepción en espera: la renta está ${formatMoneda(-economico.diferenciaMinimo)} por debajo del mínimo autorizado (${formatMoneda(local.precioMinimo)}).`
        : undefined;
  const cumplen = candados.filter((c) => c.estado !== "FALLA").length;
  const inicioRenta = sumarMeses(terminos.inicioContrato, terminos.mesesGracia);

  return (
    <div className="space-y-5">
      <PageHeader
        titulo={
          <span className="flex items-center gap-2">
            Cotización
            <ArrowRight aria-hidden className="size-6" />
            Contrato
          </span>
        }
        descripcion="Ningún contrato sale sin cotización oficial · el precio mínimo autorizado no se puede brincar"
        acciones={
          <>
            <Button variant="outline" onClick={avisarProximaFase}>
              <Send aria-hidden className="size-4" />
              Reenviar cotización
            </Button>
            <Button variant="outline" onClick={avisarProximaFase}>
              <FileDown aria-hidden className="size-4" />
              PDF cotización
            </Button>
          </>
        }
      />

      <PasosCotizacion pasos={pasos} />

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.05fr)_minmax(0,1.1fr)]">
        <section
          aria-labelledby="titulo-cotizacion"
          className="flex flex-col rounded-2xl border border-brand-line bg-card p-5 shadow-xs"
        >
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id="titulo-cotizacion"
              className="font-heading text-lg font-semibold text-brand-text"
            >
              Cotización oficial {cotizacion.id}
            </h2>
            {estadoChip}
            <span className="ml-auto text-xs text-brand-text-muted">
              Vendedor: {nombreDeUsuario(cotizacion.vendedorId) || "Sin asignar"}
            </span>
          </div>
          <FormularioTerminos
            form={form}
            deshabilitado={!editable}
            cotizacion={cotizacion}
            local={local}
            plaza={plaza}
            errorMinimo={mensajeMinimo}
          />
          {!editable ? (
            <p className="mt-3 text-xs text-brand-text-muted">
              {generado
                ? "El contrato ya se generó: los términos quedan congelados."
                : "Solo Ventas edita los términos de una cotización."}
            </p>
          ) : null}

          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            <Resumen
              etiqueta="Valor total del contrato"
              valor={<MoneyAmount valor={economico.valorTotal} />}
              subtexto={`${terminos.plazoMeses} meses, antes de incrementos`}
            />
            <Resumen
              etiqueta="Primer pago"
              valor={<MoneyAmount valor={economico.primerPago} />}
              subtexto={
                terminos.mesesGracia > 0
                  ? `depósito · renta inicia en ${formatMesAnio(inicioRenta)}`
                  : "depósito + primera renta"
              }
            />
            <Resumen
              etiqueta="Diferencia vs. mínimo"
              valor={
                <>
                  <MoneyAmount valor={economico.diferenciaMinimo} conSigno />
                  {economico.diferenciaMinimo < 0 ? " / mes" : ""}
                </>
              }
              subtexto={
                economico.diferenciaMinimo < 0 ? (
                  <>
                    <MoneyAmount valor={economico.diferenciaVigencia} conSigno /> en la
                    vigencia
                  </>
                ) : (
                  `mínimo autorizado ${formatMoneda(local.precioMinimo)}`
                )
              }
              peligro={economico.diferenciaMinimo < 0}
            />
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-brand-line pt-4">
            <Button
              variant="outline"
              disabled={!guardable}
              onClick={() => void guardar()}
            >
              Guardar
            </Button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {puedeSolicitar ? (
                <Button
                  onClick={() => setDialogoAbierto(true)}
                  className="bg-brand-cta text-white hover:bg-brand-cta-light"
                >
                  <ShieldAlert aria-hidden className="size-4" />
                  Solicitar excepción
                </Button>
              ) : null}
              <Button
                disabled={!puedeGenerar}
                onClick={() => void generar()}
                className={cn(
                  puedeGenerar && "bg-brand-cta text-white hover:bg-brand-cta-light",
                )}
              >
                {generado ? null : <Lock aria-hidden className="size-4" />}
                {generado ? "Contrato generado" : "Generar contrato"}
              </Button>
            </div>
          </div>
        </section>

        {/* iPad horizontal: la lateral apila todo en 2 columnas; desde xl se "disuelve" (3 columnas). */}
        <div className="flex min-w-0 flex-col gap-5 xl:contents">
          <div className="flex flex-col gap-5">
            <SectionCard
              className="rounded-2xl"
              titulo={<span className="whitespace-nowrap">Candados del contrato</span>}
              extra={
                <span className="whitespace-nowrap">{`${cumplen} de ${candados.length}`}</span>
              }
            >
              <ListaCandados
                candados={candados}
                detalles={{
                  COTIZACION_OFICIAL: `${cotizacion.id} · vigente hasta ${formatFecha(cotizacion.vigenteHasta)}`,
                  PRECIO_MINIMO: falloPrecio
                    ? `${formatMoneda(terminos.rentaMensual)} < ${formatMoneda(local.precioMinimo)} · requiere ajuste o una excepción autorizada por Dirección y aplicada por la PMO`
                    : undefined,
                }}
              />
              {abierta ? (
                <p className="mt-3 rounded-lg bg-brand-cta/10 px-3 py-2 text-sm text-brand-text">
                  Excepción de {formatMoneda(abierta.rentaSolicitada)}:{" "}
                  {abierta.estado === "PENDIENTE"
                    ? "en espera de que Dirección la autorice."
                    : "autorizada por Dirección, en espera de que la PMO la aplique."}
                </p>
              ) : null}
            </SectionCard>
            <SectionCard
              className="rounded-2xl"
              titulo="Historial de ofertas"
              extra={
                <span className="whitespace-nowrap">{cotizacion.ofertas.length}</span>
              }
            >
              <HistorialOfertas ofertas={cotizacion.ofertas} />
            </SectionCard>
            <SectionCard className="flex-1 rounded-2xl" titulo="Actividad">
              <ActividadCotizacion eventos={eventos} />
            </SectionCard>
          </div>

          <VistaPreviaContrato
            cotizacion={cotizacion}
            local={local}
            plaza={plaza}
            ciudad={ciudad}
            folioContrato={folioCtr}
            contratoGenerado={generado}
          />
        </div>
      </div>

      <DialogoExcepcion
        abierto={dialogoAbierto}
        onCambioAbierto={setDialogoAbierto}
        rentaSolicitada={terminos.rentaMensual}
        precioMinimo={local.precioMinimo}
        onConfirmar={solicitar}
      />
    </div>
  );
}

function Resumen({
  etiqueta,
  valor,
  subtexto,
  peligro,
}: {
  etiqueta: string;
  valor: ReactNode;
  subtexto: ReactNode;
  peligro?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl px-3 py-3",
        peligro ? "bg-brand-coral/15" : "bg-brand-cream",
      )}
    >
      <p
        className={cn("text-xs", peligro ? "text-brand-danger" : "text-brand-text-muted")}
      >
        {etiqueta}
      </p>
      <p
        className={cn(
          "mt-0.5 font-heading text-lg font-bold whitespace-nowrap",
          peligro ? "text-brand-danger" : "text-brand-text",
        )}
      >
        {valor}
      </p>
      <p
        className={cn("text-xs", peligro ? "text-brand-danger" : "text-brand-text-muted")}
      >
        {subtexto}
      </p>
    </div>
  );
}
