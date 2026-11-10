"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Timeline, type EventoTimeline } from "@/components/shared";
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
import { can } from "@/config/permissions";
import { Campo } from "@/features/cotizacion/campo";
import type { AutorizacionSobregiro, Mantenimiento } from "@/domain";
import { useSesion } from "@/hooks";
import { formatFecha, formatMoneda } from "@/lib/format";
import { useAppStore } from "@/store";

type Decision = "AUTORIZADA" | "RECHAZADA";

/** Quién solicitó, quién resolvió y cuándo, como línea de tiempo. */
export function eventosAutorizacion(a: AutorizacionSobregiro): EventoTimeline[] {
  const eventos: EventoTimeline[] = [
    {
      id: "solicitud",
      titulo: `Solicitado por ${a.solicitadoPor}`,
      detalle: `El trabajo pasa del presupuesto por ${formatMoneda(a.excedente)}.`,
      fecha: formatFecha(a.solicitadoEl),
      tono: "naranja",
    },
  ];
  if (a.estado === "PENDIENTE") {
    eventos.push({
      id: "espera",
      titulo: "Espera la decisión de Dirección",
      tono: "neutro",
    });
  } else {
    eventos.push({
      id: "resolucion",
      titulo: `${a.estado === "AUTORIZADA" ? "Autorizado" : "Rechazado"} por ${a.resueltoPor ?? "Dirección"}`,
      detalle: a.comentario,
      fecha: a.resueltoEl ? formatFecha(a.resueltoEl) : undefined,
      tono: a.estado === "AUTORIZADA" ? "verde" : "coral",
    });
  }
  return eventos;
}

function DialogoResolver({
  mantenimiento,
  decision,
  onCerrar,
}: {
  mantenimiento: Mantenimiento;
  decision: Decision;
  onCerrar: () => void;
}) {
  const autorizar = useAppStore((s) => s.autorizarSobregiro);
  const rechazar = useAppStore((s) => s.rechazarSobregiro);
  const [comentario, setComentario] = useState("");
  const [intentado, setIntentado] = useState(false);
  const rechazo = decision === "RECHAZADA";
  const error =
    rechazo && comentario.trim() === "" ? "Explica por qué se rechaza." : undefined;
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIntentado(true);
            if (error) return;
            if (rechazo) rechazar(mantenimiento.id, comentario.trim());
            else autorizar(mantenimiento.id, comentario.trim() || undefined);
            toast.success(
              `${mantenimiento.folio}: sobregiro ${rechazo ? "rechazado" : "autorizado"}`,
            );
            onCerrar();
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>
              {rechazo ? "Rechazar sobregiro" : "Autorizar sobregiro"}
            </DialogTitle>
            <DialogDescription>
              {mantenimiento.folio} · {mantenimiento.titulo}.{" "}
              {rechazo
                ? "El trabajo no podrá iniciarse; solo se podrá cancelar."
                : "El trabajo podrá iniciarse y contará en el presupuesto."}
            </DialogDescription>
          </DialogHeader>
          <Campo
            etiqueta={rechazo ? "Motivo del rechazo" : "Comentario (opcional)"}
            htmlFor="comentario-sobregiro"
            error={intentado ? error : undefined}
          >
            <Textarea
              id="comentario-sobregiro"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              aria-invalid={intentado && error ? true : undefined}
              className="md:text-base"
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
              {rechazo ? "Rechazar sobregiro" : "Autorizar sobregiro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Sección "Autorización" del detalle: historia del sobregiro y, para Dirección, resolverlo. */
export function SeccionAutorizacion({ mantenimiento }: { mantenimiento: Mantenimiento }) {
  const { rol } = useSesion();
  const [decision, setDecision] = useState<Decision | null>(null);
  const autorizacion = mantenimiento.autorizacionSobregiro;
  if (!autorizacion) return null;
  const puedeResolver =
    autorizacion.estado === "PENDIENTE" && can(rol, "mantenimiento.sobregiroAutorizar");
  return (
    <div className="space-y-3">
      <Timeline eventos={eventosAutorizacion(autorizacion)} />
      {autorizacion.estado === "PENDIENTE" ? (
        <p className="rounded-lg bg-brand-cream px-3 py-2 text-sm text-brand-text-muted ring-1 ring-brand-line">
          No se puede iniciar hasta que Dirección autorice el sobregiro.
        </p>
      ) : null}
      {puedeResolver ? (
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11 bg-brand-cta text-white hover:bg-brand-cta-light"
            onClick={() => setDecision("AUTORIZADA")}
          >
            Autorizar
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setDecision("RECHAZADA")}
          >
            Rechazar
          </Button>
        </div>
      ) : null}
      {decision ? (
        <DialogoResolver
          mantenimiento={mantenimiento}
          decision={decision}
          onCerrar={() => setDecision(null)}
        />
      ) : null}
    </div>
  );
}
