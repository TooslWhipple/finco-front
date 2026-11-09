import Link from "next/link";
import { KpiCard, KpiRow, PageHeader, StatusChip } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import {
  alertasObra,
  idPlazaDeTerreno,
  indicadoresObra,
  semaforoTerreno,
} from "@/domain";
import {
  formatFecha,
  formatMonedaMillones,
  formatNumero,
  formatPorcentaje,
} from "@/lib/format";
import { kpisExpediente } from "./agregados";
import type { ContextoExpediente } from "./contexto";

/** Encabezado del expediente: identidad del proyecto y sus indicadores de obra. */
export function EncabezadoExpediente({
  terreno: t,
  ciudad,
  contratos,
  cortes,
  pagos,
  hoy,
}: ContextoExpediente) {
  const kpis = kpisExpediente(contratos, hoy);
  const fisico = indicadoresObra(contratos, cortes, pagos, hoy)?.avanceFisico;
  const alertas = alertasObra(contratos, cortes, pagos, hoy);
  const hayObra = contratos.length > 0;
  return (
    <>
      <PageHeader
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {t.nombre}
            <StatusChip estatus={t.etapa} />
            <StatusChip estatus={semaforoTerreno(t, hoy)} />
            {alertas.length > 0 ? (
              <StatusChip
                estatus="ROJO"
                etiqueta={`${alertas.length} ${alertas.length === 1 ? "alerta" : "alertas"}`}
              />
            ) : null}
          </span>
        }
        descripcion={`${ciudad ? `${ciudad.nombre}, ${ciudad.estado}` : t.ciudadId} · ${t.responsable} · objetivo ${formatFecha(t.fechaObjetivo)}`}
        acciones={
          <>
            <Link
              href="/terrenos-y-proyectos"
              className={buttonVariants({ variant: "outline" })}
            >
              Volver a terrenos
            </Link>
            <Link
              href={`/mapa-de-plazas?plaza=${t.plazaId ?? idPlazaDeTerreno(t.id)}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Ver en mapa
            </Link>
          </>
        }
      />
      <KpiRow>
        <KpiCard
          etiqueta="Presupuesto total"
          valor={hayObra ? formatMonedaMillones(kpis.presupuesto) : "—"}
          subtexto={hayObra ? "suma de los contratos" : "sin contratos de obra"}
        />
        <KpiCard
          etiqueta="Contratos de obra"
          valor={formatNumero(kpis.contratos)}
          subtexto="con presupuesto por conceptos"
        />
        <KpiCard
          etiqueta="Avance planeado hoy"
          valor={hayObra ? formatPorcentaje(kpis.avancePlaneado) : "—"}
          subtexto={
            fisico === undefined
              ? "ponderado por importe"
              : `físico validado: ${formatPorcentaje(fisico)}`
          }
        />
        <KpiCard
          etiqueta="Fecha objetivo"
          valor={formatFecha(t.fechaObjetivo)}
          subtexto={`inicio ${formatFecha(t.inicioDesarrollo)}`}
        />
      </KpiRow>
    </>
  );
}
