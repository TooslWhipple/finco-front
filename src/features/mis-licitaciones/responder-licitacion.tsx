"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, SectionCard, StatusChip } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  estadoEnPortal,
  ETIQUETA_PARTIDA,
  rondaAbierta,
  ultimaRondaCerrada,
} from "@/domain";
import { FormularioPrecios } from "@/features/obra/licitaciones/formulario-precios";
import { useMisLicitaciones, useSesion } from "@/hooks";
import { formatFecha, formatMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { CHIP_ESTADO_PORTAL } from "./mis-licitaciones";

const VOLVER = (
  <Link
    href="/mis-licitaciones"
    className={cn(buttonVariants({ variant: "outline" }), "h-11")}
  >
    <ArrowLeft aria-hidden className="size-4" />
    Mis licitaciones
  </Link>
);

/**
 * Respuesta del contratista a una licitación: captura el precio unitario por
 * concepto y corrige mientras la ronda siga abierta. Quien no participa en la
 * ronda abierta la ve sin formulario.
 */
export function ResponderLicitacion({ id }: { id: string }) {
  const { usuario, rol } = useSesion();
  const proveedorId = usuario?.proveedorId;
  const licitacion = useMisLicitaciones(proveedorId).find((l) => l.id === id);
  const responderLicitacion = useAppStore((s) => s.responderLicitacion);

  if (!can(rol, "licitacion.responder") || !proveedorId) {
    return (
      <EmptyState
        icono={ClipboardList}
        titulo="Tu usuario no representa a un proveedor"
        descripcion="El portal de licitaciones es para los contratistas del padrón."
        accion={VOLVER}
        className="py-24"
      />
    );
  }
  if (!licitacion) {
    return (
      <EmptyState
        icono={ClipboardList}
        titulo="Esta licitación no está disponible"
        descripcion="No tienes invitación para ella o ya se cerró el proceso."
        accion={VOLVER}
        className="py-24"
      />
    );
  }

  const estado = estadoEnPortal(licitacion, proveedorId);
  const abierta = rondaAbierta(licitacion);
  const propia = abierta?.propuestas.find((p) => p.proveedorId === proveedorId);
  const numero = abierta?.numero ?? ultimaRondaCerrada(licitacion)?.numero;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`${licitacion.folio} · ${ETIQUETA_PARTIDA[licitacion.partida]}`}
        descripcion={`${licitacion.conceptos.length} conceptos${numero ? ` · ronda ${numero}` : ""}`}
        acciones={
          <>
            <StatusChip {...CHIP_ESTADO_PORTAL[estado]} />
            {VOLVER}
          </>
        }
      />
      {estado === "POR_RESPONDER" || estado === "RESPONDIDA" ? (
        <SectionCard titulo="Tu propuesta por concepto">
          {propia?.respondio ? (
            <p className="mb-4 text-sm text-brand-text-muted">
              {propia.capturadaPor === "PMO"
                ? "Finco capturó tu respuesta"
                : "Respondiste"}
              {propia.respondidaEl ? ` el ${formatFecha(propia.respondidaEl)}` : ""} por{" "}
              {formatMoneda(propia.monto ?? 0)}. Puedes corregirla mientras la ronda siga
              abierta.
            </p>
          ) : (
            <p className="mb-4 text-sm text-brand-text-muted">
              Captura tu precio unitario (sin IVA) para cada concepto; el total se calcula
              con los volúmenes del catálogo.
            </p>
          )}
          <FormularioPrecios
            key={`${abierta?.numero}-${propia?.respondidaEl ?? "nueva"}`}
            licitacion={licitacion}
            proveedorId={proveedorId}
            inicial={propia?.precios}
            etiquetaEnviar={propia?.respondio ? "Guardar corrección" : "Enviar propuesta"}
            onEnviar={(precios) => {
              responderLicitacion(licitacion.id, proveedorId, precios);
              toast.success(
                propia?.respondio ? "Corrección enviada" : "Propuesta enviada a Finco",
              );
            }}
          />
        </SectionCard>
      ) : (
        <SectionCard>
          <EmptyState
            icono={ClipboardList}
            titulo={estado === "FUERA" ? "Fuera de esta ronda" : "Ronda cerrada"}
            descripcion={
              estado === "FUERA"
                ? "No participas en la ronda abierta de esta licitación."
                : "Finco está revisando las propuestas; te avisaremos si hay otra ronda."
            }
          />
        </SectionCard>
      )}
    </div>
  );
}
