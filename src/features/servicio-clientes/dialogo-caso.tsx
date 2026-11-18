"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Campo, CLASE_SELECT } from "@/features/cotizacion/campo";
import {
  CANALES_CASO,
  contratoVigenteParaApertura,
  DEMO_TODAY,
  ETIQUETA_CANAL_CASO,
  ETIQUETA_PRIORIDAD_CASO,
  ETIQUETA_TIPO_CASO,
  nombreLocatario,
  PRIORIDADES_CASO,
  TIPOS_CASO,
  type Contrato,
} from "@/domain";
import {
  useContratosVivos,
  useFoliosFacturaLocal,
  useFuentesLocatario,
  useLocales,
  usePlazas,
} from "@/hooks";
import { formatMesAnio } from "@/lib/format";
import { useAppStore } from "@/store";
import {
  CASO_VACIO,
  casoDesdeFormulario,
  esquemaCaso,
  type CasoFormulario,
  type CasoValidado,
} from "./esquemas";

interface DialogoCasoProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
}

/** Alta de un caso de un locatario (solo con `casos.gestionar`). */
export function DialogoCaso({ abierto, onCambioAbierto }: DialogoCasoProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {abierto ? <FormularioCaso onCerrar={() => onCambioAbierto(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioCaso({ onCerrar }: { onCerrar: () => void }) {
  const registrarCaso = useAppStore((s) => s.registrarCaso);
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const contratos = useContratosVivos().datos;
  const fuentes = useFuentesLocatario();

  const form = useForm<CasoFormulario, unknown, CasoValidado>({
    resolver: zodResolver(esquemaCaso),
    defaultValues: CASO_VACIO,
    mode: "onChange",
  });
  const {
    register,
    setValue,
    formState: { errors, isValid },
  } = form;
  const plazaId = useWatch({ control: form.control, name: "plazaId" });
  const localId = useWatch({ control: form.control, name: "localId" });
  const tipo = useWatch({ control: form.control, name: "tipo" });

  // Solo locales con contrato vigente: el locatario del caso es el de ese contrato.
  const vigentePorLocal = useMemo(
    () =>
      new Map<string, Contrato>(
        (contratos ?? [])
          .filter((c) => contratoVigenteParaApertura(c, DEMO_TODAY))
          .map((c) => [c.localId, c]),
      ),
    [contratos],
  );
  const conContrato = useMemo(
    () => (locales ?? []).filter((l) => vigentePorLocal.has(l.id)),
    [locales, vigentePorLocal],
  );
  const opcionesPlaza = useMemo(() => {
    const conLocales = new Set(conContrato.map((l) => l.plazaId));
    return (plazas ?? [])
      .filter((p) => conLocales.has(p.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [plazas, conContrato]);
  const opcionesLocal = useMemo(
    () =>
      conContrato
        .filter((l) => l.plazaId === plazaId)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es")),
    [conContrato, plazaId],
  );
  const contrato = vigentePorLocal.get(localId);
  const folios = useFoliosFacturaLocal(localId).datos ?? [];

  const guardar = form.handleSubmit((v) => {
    if (!contrato) return;
    registrarCaso(casoDesdeFormulario(v, contrato.locatarioId));
    toast.success("Caso registrado");
    onCerrar();
  });

  const elegir = (campo: "localId" | "facturaId", valor = "") =>
    setValue(campo, valor, { shouldValidate: true });

  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-4" noValidate>
      <DialogHeader>
        <DialogTitle>Registrar caso</DialogTitle>
        <DialogDescription>
          Lo que reporta un locatario: nace recibido y la meta de primera respuesta corre
          desde ahora.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Plaza" htmlFor="caso-plaza" error={errors.plazaId?.message}>
          <select
            id="caso-plaza"
            className={CLASE_SELECT}
            {...register("plazaId", {
              onChange: () => {
                elegir("localId");
                elegir("facturaId");
              },
            })}
          >
            <option value="">Elige la plaza</option>
            {opcionesPlaza.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Local"
          htmlFor="caso-local"
          error={errors.localId?.message}
          ayuda={
            contrato
              ? `Locatario: ${nombreLocatario(contrato.locatarioId, fuentes)}`
              : "Solo locales con contrato vigente."
          }
        >
          <select
            id="caso-local"
            className={CLASE_SELECT}
            disabled={plazaId === ""}
            {...register("localId", { onChange: () => elegir("facturaId") })}
          >
            <option value="">Elige el local</option>
            {opcionesLocal.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Tipo" htmlFor="caso-tipo">
          <select
            id="caso-tipo"
            className={CLASE_SELECT}
            {...register("tipo", { onChange: () => elegir("facturaId") })}
          >
            {TIPOS_CASO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_CASO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Prioridad" htmlFor="caso-prioridad">
          <select id="caso-prioridad" className={CLASE_SELECT} {...register("prioridad")}>
            {PRIORIDADES_CASO.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_PRIORIDAD_CASO[p]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Canal" htmlFor="caso-canal">
          <select id="caso-canal" className={CLASE_SELECT} {...register("canal")}>
            {CANALES_CASO.map((c) => (
              <option key={c} value={c}>
                {ETIQUETA_CANAL_CASO[c]}
              </option>
            ))}
          </select>
        </Campo>
        {tipo === "ACLARACION_FACTURA" ? (
          <Campo
            etiqueta="Factura"
            htmlFor="caso-factura"
            error={errors.facturaId?.message}
            ayuda={
              localId !== "" && folios.length === 0
                ? "El local no tiene facturas con folio en los últimos tres meses."
                : "Folio y mes de las facturas del local de los últimos tres meses."
            }
          >
            <select
              id="caso-factura"
              className={CLASE_SELECT}
              disabled={folios.length === 0}
              {...register("facturaId")}
            >
              <option value="">Elige la factura</option>
              {folios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.folio} · {formatMesAnio(`${f.mes}-01`)}
                </option>
              ))}
            </select>
          </Campo>
        ) : null}
      </div>

      <Campo
        etiqueta="Descripción"
        htmlFor="caso-descripcion"
        error={errors.descripcion?.message}
      >
        <Textarea
          id="caso-descripcion"
          placeholder="Qué reporta el locatario"
          {...register("descripcion")}
        />
      </Campo>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!isValid || !contrato}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Registrar caso
        </Button>
      </DialogFooter>
    </form>
  );
}
