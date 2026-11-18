"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, MessageSquare, Reply, Star, Wrench } from "lucide-react";
import { PanelDetalle, StatusChip, Timeline } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { rutaPermitida } from "@/config/navigation";
import { can } from "@/config/permissions";
import { nombreDeUsuario } from "@/config/usuarios";
import { Campo, CLASE_SELECT } from "@/features/cotizacion/campo";
import { DialogoNuevoMantenimiento } from "@/features/mantenimientos/dialogos-mantenimiento";
import {
  DEMO_TODAY,
  ETIQUETA_CANAL_CASO,
  ETIQUETA_PRIORIDAD_CASO,
  ETIQUETA_TIPO_CASO,
  estadoMeta,
  horasEntre,
  horasPrimeraRespuesta,
  META_PRIMERA_RESPUESTA_HORAS,
  puedeEscalar,
  transicionesPermitidas,
  type CasoServicio,
} from "@/domain";
import {
  useFacturas,
  useFoliosFacturaLocal,
  useMantenimientos,
  usePlazas,
  useProveedores,
  useSesion,
} from "@/hooks";
import { formatHoras, formatMesAnio, formatMoneda, formatMomento } from "@/lib/format";
import { AHORA_DEMO, MES_DEMO } from "@/lib/tiempo";
import { useAppStore } from "@/store";
import {
  esquemaCierre,
  esquemaComentario,
  esquemaRespuesta,
  propuestaEscalamiento,
} from "./esquemas";

const CLASE_BOTON = "bg-brand-cta text-white hover:bg-brand-cta-light";

/** Cómo va la primera respuesta frente a su meta. */
function textoMeta(caso: CasoServicio): string {
  const meta = `Meta ${formatHoras(META_PRIMERA_RESPUESTA_HORAS[caso.prioridad])}`;
  const tardo = horasPrimeraRespuesta(caso);
  if (tardo !== undefined) return `${meta} · respondido en ${formatHoras(tardo)}`;
  return `${meta} · sin respuesta desde hace ${formatHoras(horasEntre(caso.abiertoEl, AHORA_DEMO))}`;
}

interface DetalleCasoProps {
  caso: CasoServicio;
  locatario: string;
  /** Código del local y nombre de la plaza. */
  ubicacion: string;
  onCerrar: () => void;
}

type Dialogo = "RESPONDER" | "COMENTAR" | "CERRAR" | "ESCALAR" | null;

/** Detalle del caso: datos, meta, factura o mantenimiento ligados, bitácora y gestión. */
export function DetalleCaso({ caso, locatario, ubicacion, onCerrar }: DetalleCasoProps) {
  const { rol } = useSesion();
  const puedeGestionar = can(rol, "casos.gestionar");
  const transicionarCaso = useAppStore((s) => s.transicionarCaso);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const folio = useFoliosFacturaLocal(caso.localId).datos?.find(
    (f) => f.id === caso.facturaId,
  );
  // Sin `cobranza.ver` la lista llega vacía: el importe solo lo ve quien tiene el permiso.
  const factura = useFacturas(folio?.mes ?? MES_DEMO).datos?.find(
    (f) => f.id === caso.facturaId,
  );
  const mantenimiento = useMantenimientos().datos.find(
    (m) => m.id === caso.mantenimientoId,
  );
  const enlazaMantenimientos = rol !== null && rutaPermitida(rol, "/mantenimientos");

  const destinos = transicionesPermitidas(caso.estatus);
  const secciones = [
    {
      titulo: "Locatario",
      contenido: (
        <>
          <p className="font-medium">{locatario}</p>
          <p className="text-brand-text-muted">
            {ubicacion} · {ETIQUETA_CANAL_CASO[caso.canal]}
          </p>
        </>
      ),
    },
    {
      titulo: "Reporte",
      contenido: (
        <>
          <p>{caso.descripcion}</p>
          <p className="text-brand-text-muted">
            {ETIQUETA_TIPO_CASO[caso.tipo]} · prioridad{" "}
            {ETIQUETA_PRIORIDAD_CASO[caso.prioridad].toLowerCase()} · abierto el{" "}
            {formatMomento(caso.abiertoEl)}
          </p>
        </>
      ),
    },
    {
      titulo: "Primera respuesta",
      contenido: (
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip estatus={estadoMeta(caso, AHORA_DEMO)} />
          <span className="text-brand-text-muted">{textoMeta(caso)}</span>
          {caso.responsableId ? (
            <span className="text-brand-text-muted">
              · atendió {nombreDeUsuario(caso.responsableId)}
            </span>
          ) : null}
        </div>
      ),
    },
    ...(caso.facturaId
      ? [
          {
            titulo: "Factura a aclarar",
            contenido: folio ? (
              <p>
                {folio.folio} · {formatMesAnio(`${folio.mes}-01`)}
                {factura ? ` · ${formatMoneda(factura.monto)}` : null}
              </p>
            ) : (
              <p className="text-brand-text-muted">
                Factura fuera de los últimos tres meses.
              </p>
            ),
          },
        ]
      : []),
    ...(mantenimiento
      ? [
          {
            titulo: "Mantenimiento",
            contenido: enlazaMantenimientos ? (
              <Link
                href={`/mantenimientos?mantenimiento=${mantenimiento.id}`}
                className="font-medium text-brand-primary hover:underline"
              >
                {mantenimiento.folio} · {mantenimiento.titulo}
              </Link>
            ) : (
              <p>
                {mantenimiento.folio} · {mantenimiento.titulo}
              </p>
            ),
          },
        ]
      : []),
    ...(caso.calificacion
      ? [{ titulo: "Calificación del locatario", contenido: `${caso.calificacion} de 5` }]
      : []),
    {
      titulo: "Bitácora",
      contenido: (
        <Timeline
          eventos={caso.bitacora.map((b) => ({
            id: b.id,
            titulo: b.texto,
            detalle: b.autor,
            fecha: formatMomento(b.fecha),
          }))}
        />
      ),
    },
  ];

  const acciones = puedeGestionar ? (
    <>
      {caso.estatus !== "CERRADO" ? (
        <Button size="sm" className={CLASE_BOTON} onClick={() => setDialogo("RESPONDER")}>
          <Reply aria-hidden />
          Responder
        </Button>
      ) : null}
      {destinos.includes("RESUELTO") ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            transicionarCaso(caso.id, "RESUELTO");
            toast.success(`Caso ${caso.folio} resuelto`);
          }}
        >
          <CheckCircle2 aria-hidden />
          Marcar resuelto
        </Button>
      ) : null}
      {destinos.includes("CERRADO") ? (
        <Button size="sm" variant="outline" onClick={() => setDialogo("CERRAR")}>
          <Star aria-hidden />
          Cerrar con calificación
        </Button>
      ) : null}
      {puedeEscalar(caso) ? (
        <Button size="sm" variant="outline" onClick={() => setDialogo("ESCALAR")}>
          <Wrench aria-hidden />
          Escalar a mantenimiento
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" onClick={() => setDialogo("COMENTAR")}>
        <MessageSquare aria-hidden />
        Comentar
      </Button>
    </>
  ) : undefined;

  return (
    <>
      <PanelDetalle
        titulo={caso.folio}
        subtitulo={locatario}
        estado={<StatusChip estatus={caso.estatus} />}
        secciones={secciones}
        acciones={acciones}
        onCerrar={onCerrar}
      />
      {puedeGestionar ? (
        <DialogosGestion
          caso={caso}
          dialogo={dialogo}
          onCerrarDialogo={() => setDialogo(null)}
        />
      ) : null}
    </>
  );
}

/** Diálogos de gestión del caso; solo se montan con `casos.gestionar`. */
function DialogosGestion({
  caso,
  dialogo,
  onCerrarDialogo,
}: {
  caso: CasoServicio;
  dialogo: Dialogo;
  onCerrarDialogo: () => void;
}) {
  const responderCaso = useAppStore((s) => s.responderCaso);
  const comentarCaso = useAppStore((s) => s.comentarCaso);
  const transicionarCaso = useAppStore((s) => s.transicionarCaso);
  const escalarCasoAMantenimiento = useAppStore((s) => s.escalarCasoAMantenimiento);
  const plazas = usePlazas().datos ?? [];
  const proveedores = useProveedores();
  const cambio = (abierto: boolean) => {
    if (!abierto) onCerrarDialogo();
  };
  return (
    <>
      <DialogoTexto
        abierto={dialogo === "RESPONDER"}
        onCambioAbierto={cambio}
        titulo="Responder al locatario"
        descripcion="La primera respuesta detiene el reloj de la meta y pasa el caso a En atención."
        etiqueta="Respuesta"
        esquema={esquemaRespuesta}
        boton="Enviar respuesta"
        onGuardar={(texto) => {
          responderCaso(caso.id, texto);
          toast.success(`Respuesta registrada en ${caso.folio}`);
        }}
      />
      <DialogoTexto
        abierto={dialogo === "COMENTAR"}
        onCambioAbierto={cambio}
        titulo="Comentar el caso"
        descripcion="Nota interna en la bitácora: no cuenta como respuesta al locatario."
        etiqueta="Comentario"
        esquema={esquemaComentario}
        boton="Guardar comentario"
        onGuardar={(texto) => comentarCaso(caso.id, texto)}
      />
      <DialogoCierre
        abierto={dialogo === "CERRAR"}
        onCambioAbierto={cambio}
        folio={caso.folio}
        onCerrarCaso={(calificacion) => {
          transicionarCaso(caso.id, "CERRADO", calificacion);
          toast.success(`Caso ${caso.folio} cerrado`);
        }}
      />
      {dialogo === "ESCALAR" ? (
        <DialogoNuevoMantenimiento
          abierto
          onCambioAbierto={cambio}
          plazas={plazas.filter((p) => p.id === caso.plazaId)}
          proveedores={proveedores}
          filtro={{ plazaId: caso.plazaId, localId: caso.localId }}
          inicial={propuestaEscalamiento(caso, DEMO_TODAY)}
          fijo={{ tipo: "CORRECTIVO", origen: "LOCATARIO" }}
          onCrear={(nuevo) => escalarCasoAMantenimiento(caso.id, nuevo)}
        />
      ) : null}
    </>
  );
}

function DialogoTexto({
  abierto,
  onCambioAbierto,
  titulo,
  descripcion,
  etiqueta,
  esquema,
  boton,
  onGuardar,
}: {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  titulo: string;
  descripcion: string;
  etiqueta: string;
  esquema: typeof esquemaRespuesta;
  boton: string;
  onGuardar: (texto: string) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        {abierto ? (
          <FormularioTexto
            titulo={titulo}
            descripcion={descripcion}
            etiqueta={etiqueta}
            esquema={esquema}
            boton={boton}
            onCerrar={() => onCambioAbierto(false)}
            onGuardar={onGuardar}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioTexto({
  titulo,
  descripcion,
  etiqueta,
  esquema,
  boton,
  onCerrar,
  onGuardar,
}: {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  esquema: typeof esquemaRespuesta;
  boton: string;
  onCerrar: () => void;
  onGuardar: (texto: string) => void;
}) {
  const form = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { texto: "" },
    mode: "onChange",
  });
  const guardar = form.handleSubmit(({ texto }) => {
    onGuardar(texto);
    onCerrar();
  });
  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-4" noValidate>
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>{descripcion}</DialogDescription>
      </DialogHeader>
      <Campo
        etiqueta={etiqueta}
        htmlFor="caso-texto"
        error={form.formState.errors.texto?.message}
      >
        <Textarea id="caso-texto" {...form.register("texto")} />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!form.formState.isValid} className={CLASE_BOTON}>
          {boton}
        </Button>
      </DialogFooter>
    </form>
  );
}

const CALIFICACIONES = [5, 4, 3, 2, 1] as const;

function DialogoCierre({
  abierto,
  onCambioAbierto,
  folio,
  onCerrarCaso,
}: {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  folio: string;
  onCerrarCaso: (calificacion: number) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        {abierto ? (
          <FormularioCierre
            folio={folio}
            onCerrar={() => onCambioAbierto(false)}
            onCerrarCaso={onCerrarCaso}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioCierre({
  folio,
  onCerrar,
  onCerrarCaso,
}: {
  folio: string;
  onCerrar: () => void;
  onCerrarCaso: (calificacion: number) => void;
}) {
  const form = useForm({ resolver: zodResolver(esquemaCierre), mode: "onChange" });
  const guardar = form.handleSubmit(({ calificacion }) => {
    onCerrarCaso(calificacion);
    onCerrar();
  });
  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-4" noValidate>
      <DialogHeader>
        <DialogTitle>Cerrar el caso {folio}</DialogTitle>
        <DialogDescription>
          Registra qué tan satisfecho quedó el locatario. Un caso cerrado no se reabre.
        </DialogDescription>
      </DialogHeader>
      <Campo
        etiqueta="Calificación del locatario"
        htmlFor="caso-calificacion"
        error={form.formState.errors.calificacion?.message}
      >
        <select
          id="caso-calificacion"
          className={CLASE_SELECT}
          defaultValue=""
          {...form.register("calificacion", { valueAsNumber: true })}
        >
          <option value="" disabled>
            Elige del 1 al 5
          </option>
          {CALIFICACIONES.map((c) => (
            <option key={c} value={c}>
              {c} de 5
            </option>
          ))}
        </select>
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!form.formState.isValid} className={CLASE_BOTON}>
          Cerrar caso
        </Button>
      </DialogFooter>
    </form>
  );
}
