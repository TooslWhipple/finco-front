"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/config/permissions";
import {
  DEMO_TODAY,
  pactarRegla,
  sumarDias,
  type Cotizacion,
  type Plaza,
  type Prospecto,
} from "@/domain";
import {
  useCotizaciones,
  useLocal,
  useLocales,
  usePlazas,
  useProspectos,
  useSesion,
} from "@/hooks";
import { formatMoneda } from "@/lib/format";
import { useAppStore } from "@/store";
import { siguienteFolio } from "./calculos";
import { Campo, CLASE_SELECT } from "./campo";
import { esquemaNuevaCotizacion, type NuevaCotizacionFormulario } from "./esquemas";

/** Vigencia de una cotización recién emitida. */
const VIGENCIA_DIAS = 15;
const PLAZO_POR_OMISION = 36;

export function NuevaCotizacion() {
  const params = useSearchParams();
  const localParam = params.get("local") ?? "";
  const plazaParam = params.get("plaza") ?? "";
  const prospectoParam = params.get("prospecto") ?? "";
  const { rol } = useSesion();
  const prospectoInicial = useProspectos().datos.find((p) => p.id === prospectoParam);
  const localInicial = useLocal(localParam);
  const plazas = usePlazas();

  if (!can(rol, "cotizaciones.crear")) {
    return (
      <SectionCard>
        <EmptyState
          icono={Lock}
          titulo="Tu rol no crea cotizaciones"
          descripcion="Cambia a Ventas para generar una cotización desde un local."
        />
      </SectionCard>
    );
  }
  if (localInicial.cargando || !plazas.datos) {
    return <p className="text-sm text-brand-text-muted">Cargando…</p>;
  }

  const plazaId = localInicial.datos?.plazaId ?? plazaParam;
  return (
    <FormularioNueva
      plazas={plazas.datos}
      inicial={{
        plazaId: plazas.datos.some((p) => p.id === plazaId) ? plazaId : "",
        localId: localInicial.datos?.id ?? "",
        precio: localInicial.datos?.precioVigente,
        prospecto: prospectoInicial,
      }}
    />
  );
}

interface FormularioNuevaProps {
  plazas: Pick<Plaza, "id" | "nombre" | "reglaDefault">[];
  inicial: {
    plazaId: string;
    localId: string;
    precio?: number;
    /** Prospecto del embudo desde el que se abrió la cotización. */
    prospecto?: Prospecto;
  };
}

function FormularioNueva({ plazas, inicial }: FormularioNuevaProps) {
  const router = useRouter();
  const { usuario } = useSesion();
  const crearCotizacion = useAppStore((s) => s.crearCotizacion);
  const cotizaciones = useCotizaciones();

  const form = useForm<NuevaCotizacionFormulario>({
    resolver: zodResolver(esquemaNuevaCotizacion),
    defaultValues: {
      plazaId: inicial.plazaId,
      localId: inicial.localId,
      prospecto: inicial.prospecto?.nombre ?? "",
      documentosCompletos: inicial.prospecto?.documentosCompletos ?? true,
      avalRegistrado: inicial.prospecto ? Boolean(inicial.prospecto.aval) : true,
      rentaMensual: inicial.precio ?? 0,
      plazoMeses: PLAZO_POR_OMISION,
    },
    mode: "onChange",
  });
  const {
    register,
    setValue,
    formState: { errors, isValid },
  } = form;
  const plazaId = useWatch({ control: form.control, name: "plazaId" });
  const localId = useWatch({ control: form.control, name: "localId" });

  const locales = useLocales(plazaId || undefined);
  const cotizables = (plazaId ? (locales.datos ?? []) : []).filter(
    (l) => l.estatus === "DISPONIBLE" || l.estatus === "EN_COTIZACION",
  );
  const local = cotizables.find((l) => l.id === localId);
  const previas = cotizaciones.filter((c) => c.localId === localId);

  function alElegirLocal(id: string) {
    setValue("localId", id, { shouldValidate: true });
    const elegido = cotizables.find((l) => l.id === id);
    if (elegido)
      setValue("rentaMensual", elegido.precioVigente, { shouldValidate: true });
  }

  const crear = form.handleSubmit((v) => {
    if (!local) return;
    const plaza = plazas.find((p) => p.id === v.plazaId);
    const folio = siguienteFolio(useAppStore.getState().cotizaciones.cotizaciones);
    const nueva: Cotizacion = {
      id: folio,
      localId: v.localId,
      prospectoId: inicial.prospecto?.id,
      prospecto: {
        nombre: v.prospecto,
        documentosCompletos: v.documentosCompletos,
        aval: v.avalRegistrado ? "Aval solidario registrado" : undefined,
      },
      rentaMensual: v.rentaMensual,
      plazoMeses: v.plazoMeses,
      emitidaEl: DEMO_TODAY,
      vigenteHasta: sumarDias(DEMO_TODAY, VIGENCIA_DIAS),
      estado: "BORRADOR",
      // Instantánea: la regla vigente del local hoy, ya con el default editado de su plaza.
      ...pactarRegla(local.regla, plaza?.reglaDefault),
    };
    crearCotizacion(nueva);
    toast.success(`Cotización ${folio} creada`, {
      description: usuario ? `A nombre de ${usuario.nombre}.` : undefined,
    });
    router.push(`/cotizaciones/${folio}`);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Nueva cotización"
        descripcion="Elige el local y captura al prospecto. Los candados se evalúan en la siguiente pantalla."
      />
      <SectionCard titulo="Datos de la cotización" className="max-w-3xl">
        <form
          onSubmit={(e) => void crear(e)}
          className="grid grid-cols-2 gap-4"
          noValidate
        >
          <Campo etiqueta="Plaza" htmlFor="plaza" error={errors.plazaId?.message}>
            <select
              id="plaza"
              className={CLASE_SELECT}
              {...register("plazaId", {
                onChange: () => setValue("localId", "", { shouldValidate: true }),
              })}
            >
              <option value="">Elige una plaza</option>
              {plazas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo
            etiqueta="Local"
            htmlFor="local"
            error={errors.localId?.message}
            ayuda={
              plazaId && !locales.cargando && cotizables.length === 0
                ? "Esta plaza no tiene locales cotizables."
                : undefined
            }
          >
            <select
              id="local"
              className={CLASE_SELECT}
              disabled={!plazaId}
              value={localId}
              onChange={(e) => alElegirLocal(e.target.value)}
            >
              <option value="">Elige un local</option>
              {cotizables.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} · {l.areaM2} m² · {formatMoneda(l.precioVigente)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo
            etiqueta="Prospecto"
            htmlFor="prospecto"
            error={errors.prospecto?.message}
            className="col-span-2"
          >
            <Input
              id="prospecto"
              placeholder="Razón social o nombre"
              {...register("prospecto")}
            />
          </Campo>
          <Campo
            etiqueta="Renta mensual (MXN)"
            htmlFor="renta-nueva"
            error={errors.rentaMensual?.message}
            ayuda={
              local
                ? `Lista ${formatMoneda(local.precioVigente)} · mínimo autorizado ${formatMoneda(local.precioMinimo)}`
                : undefined
            }
          >
            <Input
              id="renta-nueva"
              type="number"
              inputMode="numeric"
              min={0}
              step={10}
              {...register("rentaMensual", { valueAsNumber: true })}
            />
          </Campo>
          <Campo
            etiqueta="Plazo (meses)"
            htmlFor="plazo-nueva"
            error={errors.plazoMeses?.message}
          >
            <Input
              id="plazo-nueva"
              type="number"
              inputMode="numeric"
              min={1}
              {...register("plazoMeses", { valueAsNumber: true })}
            />
          </Campo>
          <label className="col-span-2 flex items-center gap-2 text-sm text-brand-text">
            <input
              type="checkbox"
              className="size-4 accent-brand-secondary"
              {...register("documentosCompletos")}
            />
            Expediente del prospecto completo
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm text-brand-text">
            <input
              type="checkbox"
              className="size-4 accent-brand-secondary"
              {...register("avalRegistrado")}
            />
            Aval / fianza registrada
          </label>
          {previas.length > 0 ? (
            <p className="col-span-2 rounded-lg bg-brand-cream px-3 py-2 text-sm text-brand-text-muted ring-1 ring-brand-line">
              Este local ya tiene{" "}
              {previas.map((c, i) => (
                <span key={c.id}>
                  {i > 0 ? ", " : ""}
                  <Link
                    href={`/cotizaciones/${c.id}`}
                    className="font-medium text-brand-primary underline"
                  >
                    {c.id}
                  </Link>
                </span>
              ))}
              .
            </p>
          ) : null}
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className="bg-brand-cta text-white hover:bg-brand-cta-light"
            >
              Crear cotización
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
