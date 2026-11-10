"use client";

import { useMemo, useState } from "react";
import { Mail, MessageCircle, Play, Save } from "lucide-react";
import { toast } from "sonner";
import {
  avisosParaEnviar,
  DEMO_TODAY,
  DIAS_SEMANA,
  DISPARADORES,
  disparadorDeFactura,
  HORA_DEMO,
  idPlantilla,
  proximaEjecucion,
  type CanalAviso,
  type DiaSemana,
  type DisparadorAviso,
  type EnvioAviso,
  type Factura,
  type PlantillaAviso,
} from "@/domain";
import { SectionCard, SegmentedControl, StatusChip } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { can } from "@/config/permissions";
import { useFacturas, useLocales, useLocatarios, usePlazas, useSesion } from "@/hooks";
import { formatDiaMes, formatNumero } from "@/lib/format";
import { MES_DEMO } from "@/lib/tiempo";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  formatEjecucion,
  renderPlantilla,
  VARIABLES_PLANTILLA,
  type ContextoAviso,
} from "./avisos";

const ETIQUETA_DISPARADOR: Record<DisparadorAviso, string> = {
  ANTES_3: "3 días antes del vencimiento",
  DIA_PAGO: "Día de pago",
  ATRASO_5: "5 días de atraso",
  ATRASO_15: "15 días de atraso",
  ATRASO_30: "30 días de atraso",
};

const ETIQUETA_CANAL: Record<CanalAviso, string> = {
  WHATSAPP: "WhatsApp",
  CORREO: "Correo",
};

const OPCIONES_CANAL = [
  { valor: "WHATSAPP", etiqueta: "WhatsApp" },
  { valor: "CORREO", etiqueta: "Correo" },
] as const;

/** Envíos que muestra la bitácora; el resto queda en el estado. */
const FILAS_BITACORA = 25;

const SOLO_44 = "[&_button]:min-h-11 [&_button]:px-4";

export function AvisosAutomaticos() {
  const { rol } = useSesion();
  const puedeEditar = can(rol, "cobranza.avisosProgramar");

  const { datos: facturas } = useFacturas(MES_DEMO);
  const { datos: locales } = useLocales();
  const { datos: plazas } = usePlazas();
  const { datos: locatarios } = useLocatarios();

  const plantillas = useAppStore((s) => s.cobranza.plantillas);
  const programacion = useAppStore((s) => s.cobranza.programacion);
  const envios = useAppStore((s) => s.cobranza.envios);
  const editarPlantilla = useAppStore((s) => s.editarPlantillaAviso);
  const guardarProgramacion = useAppStore((s) => s.guardarProgramacionAvisos);
  const registrarAvisos = useAppStore((s) => s.registrarAvisos);

  const todas = useMemo(() => facturas ?? [], [facturas]);
  const local = useMemo(() => new Map((locales ?? []).map((l) => [l.id, l])), [locales]);
  const plazaPorId = useMemo(
    () => new Map((plazas ?? []).map((p) => [p.id, p.nombre])),
    [plazas],
  );
  const locatarioPorId = useMemo(
    () => new Map((locatarios ?? []).map((t) => [t.id, t.nombre])),
    [locatarios],
  );

  const contextoDe = (factura: Factura): ContextoAviso => {
    const l = local.get(factura.localId);
    return {
      locatario: locatarioPorId.get(factura.locatarioId) ?? factura.locatarioId,
      local: l?.codigo ?? factura.localId,
      plaza: (l && plazaPorId.get(l.plazaId)) ?? "",
      hoy: DEMO_TODAY,
    };
  };

  // --- Programación -------------------------------------------------------
  const [dias, setDias] = useState<DiaSemana[]>(programacion.dias);
  const [hora, setHora] = useState(programacion.hora);
  const [activa, setActiva] = useState(programacion.activa);

  const sucia =
    activa !== programacion.activa ||
    hora !== programacion.hora ||
    dias.join() !== programacion.dias.join();

  const proxima = proximaEjecucion(programacion, { fecha: DEMO_TODAY, hora: HORA_DEMO });

  const alternarDia = (dia: DiaSemana) =>
    setDias((actuales) =>
      DIAS_SEMANA.map((d) => d.valor).filter((v) =>
        v === dia ? !actuales.includes(v) : actuales.includes(v),
      ),
    );

  const guardar = () => {
    guardarProgramacion({ activa, dias, hora });
    toast.success("Programación guardada");
  };

  const porEnviar = useMemo(
    () => avisosParaEnviar(todas, DEMO_TODAY, envios),
    [todas, envios],
  );

  const ejecutarAhora = () => {
    if (porEnviar.length === 0) {
      toast.info("No hay avisos pendientes para hoy");
      return;
    }
    registrarAvisos(
      porEnviar.map((a) => ({
        facturaId: a.factura.id,
        plantillaId: idPlantilla(a.disparador, a.canal),
        canal: a.canal,
      })),
      `Aviso automático enviado el ${formatDiaMes(DEMO_TODAY)} (simulado)`,
      "PROGRAMADO",
      programacion.hora,
    );
    toast.success(`${formatNumero(porEnviar.length)} avisos agregados a la bitácora`);
  };

  // --- Plantillas ---------------------------------------------------------
  const [canal, setCanal] = useState<CanalAviso>("WHATSAPP");
  const [disparador, setDisparador] = useState<DisparadorAviso>("ATRASO_5");
  const plantilla = plantillas.find((p) => p.id === idPlantilla(disparador, canal));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <SectionCard
          titulo="Plantillas de aviso"
          extra={
            <SegmentedControl
              etiqueta="Canal de la plantilla"
              opciones={OPCIONES_CANAL}
              valor={canal}
              onChange={setCanal}
              className={SOLO_44}
            />
          }
        >
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <ul aria-label="Disparadores" className="flex flex-wrap gap-2 md:flex-col">
              {DISPARADORES.map((d) => (
                <li key={d} className="md:w-full">
                  <button
                    type="button"
                    aria-pressed={d === disparador}
                    onClick={() => setDisparador(d)}
                    className={cn(
                      "min-h-11 w-full rounded-lg border px-3 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      d === disparador
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-brand-line bg-card text-brand-text hover:bg-brand-cream",
                    )}
                  >
                    {ETIQUETA_DISPARADOR[d]}
                  </button>
                </li>
              ))}
            </ul>
            {plantilla ? (
              <EditorPlantilla
                key={plantilla.id}
                plantilla={plantilla}
                facturas={todas}
                contextoDe={contextoDe}
                puedeEditar={puedeEditar}
                onGuardar={(parche) => {
                  editarPlantilla(plantilla.id, parche);
                  toast.success("Plantilla guardada");
                }}
              />
            ) : null}
          </div>
        </SectionCard>

        <Bitacora
          envios={envios}
          facturas={todas}
          plantillas={plantillas}
          contextoDe={contextoDe}
        />
      </div>

      <SectionCard titulo="Programación">
        <div className="space-y-5">
          <button
            type="button"
            role="switch"
            aria-checked={activa}
            disabled={!puedeEditar}
            onClick={() => setActiva((a) => !a)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-brand-line px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          >
            Envío automático {activa ? "activo" : "apagado"}
            <span
              aria-hidden
              className={cn(
                "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
                activa ? "bg-brand-secondary" : "bg-brand-line",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-white shadow-xs transition-transform",
                  activa ? "translate-x-5" : "translate-x-0",
                )}
              />
            </span>
          </button>

          <div>
            <p className="mb-2 text-sm font-medium text-brand-text">Días de envío</p>
            <div role="group" aria-label="Días de envío" className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((d) => (
                <button
                  key={d.valor}
                  type="button"
                  aria-pressed={dias.includes(d.valor)}
                  aria-label={d.largo}
                  disabled={!puedeEditar}
                  onClick={() => alternarDia(d.valor)}
                  className={cn(
                    "size-11 rounded-lg border text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
                    dias.includes(d.valor)
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-brand-line bg-card text-brand-text",
                  )}
                >
                  {d.corto}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-medium text-brand-text">
            Hora
            <Input
              type="time"
              value={hora}
              disabled={!puedeEditar}
              onChange={(e) => e.target.value && setHora(e.target.value)}
              className="mt-2 h-11 text-base md:text-base"
            />
          </label>

          <p className="rounded-lg bg-brand-cream px-3 py-2 text-sm text-brand-text">
            <span className="text-brand-text-muted">Próxima ejecución: </span>
            <strong>{proxima ? formatEjecucion(proxima) : "sin programar"}</strong>
          </p>

          {puedeEditar ? (
            <div className="flex flex-wrap gap-2">
              <Button className="h-11 px-4" disabled={!sucia} onClick={guardar}>
                <Save aria-hidden />
                Guardar programación
              </Button>
              <Button variant="outline" className="h-11 px-4" onClick={ejecutarAhora}>
                <Play aria-hidden />
                Ejecutar ahora ({formatNumero(porEnviar.length)})
              </Button>
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">
              Solo Cobranza puede editar plantillas y programar los envíos.
            </p>
          )}
          <p className="text-xs text-brand-text-muted">
            En el prototipo ningún aviso sale de verdad: todo queda como simulado.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

interface EditorPlantillaProps {
  plantilla: PlantillaAviso;
  facturas: Factura[];
  contextoDe: (factura: Factura) => ContextoAviso;
  puedeEditar: boolean;
  onGuardar: (parche: { asunto?: string; cuerpo: string }) => void;
}

function EditorPlantilla({
  plantilla,
  facturas,
  contextoDe,
  puedeEditar,
  onGuardar,
}: EditorPlantillaProps) {
  const [asunto, setAsunto] = useState(plantilla.asunto ?? "");
  const [cuerpo, setCuerpo] = useState(plantilla.cuerpo);

  // Una factura real a la que hoy le toca este disparador; si ninguna, la más reciente sin pagar.
  const ejemplo = useMemo(
    () =>
      facturas.find((f) => disparadorDeFactura(f, DEMO_TODAY) === plantilla.disparador) ??
      facturas.find((f) => !f.pagadaEl),
    [facturas, plantilla.disparador],
  );
  const mensaje = ejemplo
    ? renderPlantilla(
        { asunto: plantilla.canal === "CORREO" ? asunto : undefined, cuerpo },
        ejemplo,
        contextoDe(ejemplo),
      )
    : null;

  const sucia = cuerpo !== plantilla.cuerpo || asunto !== (plantilla.asunto ?? "");
  const esCorreo = plantilla.canal === "CORREO";

  return (
    <div className="space-y-4">
      {esCorreo ? (
        <label className="block text-sm font-medium text-brand-text">
          Asunto
          <Input
            value={asunto}
            disabled={!puedeEditar}
            onChange={(e) => setAsunto(e.target.value)}
            className="mt-2 h-11 text-base md:text-base"
          />
        </label>
      ) : null}
      <label className="block text-sm font-medium text-brand-text">
        Mensaje
        <Textarea
          value={cuerpo}
          disabled={!puedeEditar}
          rows={esCorreo ? 7 : 5}
          onChange={(e) => setCuerpo(e.target.value)}
          className="mt-2 text-base md:text-base"
        />
      </label>

      {puedeEditar ? (
        <div>
          <p className="mb-2 text-xs text-brand-text-muted">
            Toca una variable para agregarla al final del mensaje.
          </p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES_PLANTILLA.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setCuerpo((c) => `${c}{${v}}`)}
                className="min-h-11 rounded-lg border border-brand-line bg-card px-3 font-mono text-xs text-brand-text outline-none hover:bg-brand-cream focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {`{${v}}`}
              </button>
            ))}
          </div>
          <Button
            className="mt-3 h-11 px-4"
            disabled={!sucia || cuerpo.trim() === ""}
            onClick={() =>
              onGuardar({ cuerpo, ...(esCorreo ? { asunto: asunto.trim() } : {}) })
            }
          >
            <Save aria-hidden />
            Guardar plantilla
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border border-brand-line bg-brand-cream p-4">
        <p className="mb-2 text-xs font-medium tracking-wide text-brand-text-muted uppercase">
          Vista previa{ejemplo ? ` · ${contextoDe(ejemplo).locatario}` : ""}
        </p>
        {mensaje ? (
          <div className="space-y-2 text-sm text-brand-text">
            {mensaje.asunto ? <p className="font-semibold">{mensaje.asunto}</p> : null}
            <p className="whitespace-pre-line" data-testid="vista-previa">
              {mensaje.cuerpo}
            </p>
          </div>
        ) : (
          <p className="text-sm text-brand-text-muted">
            No hay facturas para ejemplificar.
          </p>
        )}
      </div>
    </div>
  );
}

interface BitacoraProps {
  envios: EnvioAviso[];
  facturas: Factura[];
  plantillas: PlantillaAviso[];
  contextoDe: (factura: Factura) => ContextoAviso;
}

function Bitacora({ envios, facturas, plantillas, contextoDe }: BitacoraProps) {
  const facturaPorId = useMemo(() => new Map(facturas.map((f) => [f.id, f])), [facturas]);
  const disparadorDe = useMemo(
    () => new Map(plantillas.map((p) => [p.id, p.disparador])),
    [plantillas],
  );
  const recientes = useMemo(
    () =>
      envios
        .map((e, i) => ({ e, i }))
        .sort(
          (a, b) =>
            b.e.enviadoEl.localeCompare(a.e.enviadoEl) ||
            b.e.hora.localeCompare(a.e.hora) ||
            b.i - a.i,
        )
        .slice(0, FILAS_BITACORA)
        .map(({ e }) => e),
    [envios],
  );

  return (
    <SectionCard
      titulo="Bitácora de envíos"
      extra={`${formatNumero(envios.length)} en total`}
    >
      {recientes.length === 0 ? (
        <p className="text-sm text-brand-text-muted">Aún no hay envíos registrados.</p>
      ) : (
        <ul className="divide-y divide-brand-line">
          {recientes.map((e) => {
            const factura = facturaPorId.get(e.facturaId);
            const Icono = e.canal === "WHATSAPP" ? MessageCircle : Mail;
            const disparador = disparadorDe.get(e.plantillaId);
            return (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm"
              >
                <Icono
                  aria-label={ETIQUETA_CANAL[e.canal]}
                  className="size-4 shrink-0 text-brand-primary"
                />
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block truncate font-medium text-brand-text">
                    {factura ? contextoDe(factura).locatario : e.facturaId}
                  </span>
                  <span className="block truncate text-xs text-brand-text-muted">
                    {factura?.folio ?? e.facturaId}
                    {disparador ? ` · ${ETIQUETA_DISPARADOR[disparador]}` : ""}
                  </span>
                </span>
                <span className="text-brand-text-muted tabular-nums">
                  {formatDiaMes(e.enviadoEl)} · {e.hora}
                </span>
                <span className="text-brand-text-muted">
                  {e.origen === "PROGRAMADO" ? "Programado" : "Manual"}
                </span>
                <StatusChip estatus="SIMULADO" />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
