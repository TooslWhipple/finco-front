"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Ayuda, KpiCard, KpiRow, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { can } from "@/config/permissions";
import { cumplimientoPlan, DEMO_TODAY, rentasDeLocales, type Plaza } from "@/domain";
import { useContratos, useLocales, useSesion } from "@/hooks";
import { formatMoneda } from "@/lib/format";
import { formatPuntosUnDecimal } from "@/features/local/calculos";
import { useAppStore } from "@/store";
import { validarMeta } from "./calculos";

/** Plan de ingresos de la plaza: cumplimiento, meta y potencial; la PMO edita la meta. */
export function MetaIngresos({ plaza }: { plaza: Plaza }) {
  const { rol } = useSesion();
  const locales = useLocales(plaza.id).datos;
  const contratos = useContratos().datos;
  const establecerMeta = useAppStore((s) => s.establecerMetaPlaza);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string>();

  const plan = useMemo(() => {
    if (!locales || !contratos) return undefined;
    const { ocupados, disponibles } = rentasDeLocales(locales, contratos, DEMO_TODAY);
    return cumplimientoPlan(ocupados, disponibles);
  }, [locales, contratos]);

  const meta = plaza.metaCumplimientoPct;
  const bajoMeta = plan !== undefined && plan.cumplimientoPct < meta;

  function abrir() {
    setTexto(String(meta));
    setError(undefined);
    setEditando(true);
  }

  function guardar(evento: FormEvent) {
    evento.preventDefault();
    const resultado = validarMeta(texto);
    if (typeof resultado === "string") {
      setError(resultado);
      return;
    }
    establecerMeta(plaza.id, resultado);
    toast.success(`Meta de ${plaza.nombre} actualizada`);
    setEditando(false);
  }

  return (
    <SectionCard
      titulo={`Plan de ingresos · ${plaza.nombre}`}
      extra={
        can(rol, "metaIngresos.editar") ? (
          <Button variant="outline" size="sm" onClick={abrir}>
            <Pencil aria-hidden />
            Editar meta
          </Button>
        ) : undefined
      }
    >
      <KpiRow>
        <KpiCard
          etiqueta={
            <Ayuda texto="Renta contratada de los locales ocupados entre la renta planeada por la PMO">
              Cumplimiento del plan
            </Ayuda>
          }
          valor={plan ? formatPuntosUnDecimal(plan.cumplimientoPct) : "—"}
          detalle={bajoMeta ? "Bajo la meta" : "Cumple la meta"}
          tono={bajoMeta ? "peligro" : "positivo"}
        />
        <KpiCard
          etiqueta="Meta de la plaza"
          valor={formatPuntosUnDecimal(meta)}
          subtexto="la define la PMO"
        />
        <KpiCard
          etiqueta={
            <Ayuda texto="Cumplimiento si los locales disponibles se rentan a precio de lista">
              Potencial
            </Ayuda>
          }
          valor={plan ? formatPuntosUnDecimal(plan.potencialPct) : "—"}
          subtexto="con los disponibles a lista"
        />
        <KpiCard
          etiqueta="Renta contratada"
          valor={plan ? formatMoneda(plan.contratada) : "—"}
          subtexto={plan ? `de ${formatMoneda(plan.planeada)} planeados` : undefined}
        />
      </KpiRow>
      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent>
          <form onSubmit={guardar} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Meta de cumplimiento del plan</DialogTitle>
              <DialogDescription>
                {plaza.nombre} · se compara con la renta contratada contra la planeada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label htmlFor="meta-cumplimiento" className="text-sm font-medium">
                Meta (%)
              </label>
              <Input
                id="meta-cumplimiento"
                inputMode="decimal"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
              {error ? (
                <p role="alert" className="text-xs text-brand-danger">
                  {error}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar meta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
