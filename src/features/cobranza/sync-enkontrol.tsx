"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Plug, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DEMO_TODAY } from "@/domain";
import { Button, buttonVariants } from "@/components/ui/button";
import { useEstadoIntegracion } from "@/hooks";
import { formatMoneda, formatNumero, formatPorcentaje } from "@/lib/format";
import { AHORA_DEMO } from "@/lib/tiempo";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { DialogoDiferencias } from "./dialogo-diferencias";

const PASOS = [
  "Conectando con EnKontrol…",
  "Timbrando facturas…",
  "Aplicando pagos…",
  "Generando pólizas…",
  "Conciliando…",
];
const MS_POR_PASO = 450;

interface SyncEnKontrolProps {
  puedeSincronizar: boolean;
  /** Folio por id de factura, para nombrar las diferencias. */
  folios: ReadonlyMap<string, string>;
}

export function SyncEnKontrol({ puedeSincronizar, folios }: SyncEnKontrolProps) {
  const { datos } = useEstadoIntegracion();
  const registrarSync = useAppStore((s) => s.registrarSync);
  const [paso, setPaso] = useState<number | null>(null);
  const [verDiferencias, setVerDiferencias] = useState(false);
  const sincronizando = paso !== null;
  const facturasTotales = datos?.facturasTotales ?? 0;

  useEffect(() => {
    if (!sincronizando) return;
    let actual = 0;
    const id = setInterval(() => {
      actual += 1;
      if (actual >= PASOS.length) {
        clearInterval(id);
        registrarSync({
          integracionId: "ENKONTROL",
          fecha: AHORA_DEMO,
          resultado: "OK",
          detalle: "Sincronización manual desde Cobranza",
          registros: facturasTotales,
        });
        setPaso(null);
        toast.success("EnKontrol sincronizado");
        return;
      }
      setPaso(actual);
    }, MS_POR_PASO);
    return () => clearInterval(id);
  }, [sincronizando, registrarSync, facturasTotales]);

  if (!datos) return null;

  const diferencias = datos.diferencias.length;
  const montoDiferencias = datos.diferencias.reduce((suma, d) => suma + d.monto, 0);
  const elementos = [
    {
      etiqueta: "Facturas CFDI timbradas",
      detalle: `${formatNumero(datos.facturasTimbradas)} / ${formatNumero(datos.facturasTotales)}`,
      ok: datos.facturasTimbradas === datos.facturasTotales,
    },
    {
      etiqueta: "Pagos aplicados (SPEI y depósito)",
      detalle: `${formatNumero(datos.pagosAplicados)} hoy`,
      ok: true,
    },
    {
      etiqueta: "Pólizas contables generadas",
      detalle: formatNumero(datos.polizasGeneradas),
      ok: datos.polizasGeneradas === datos.pagosAplicados,
    },
    {
      etiqueta: "Diferencias por conciliar",
      detalle:
        diferencias === 0
          ? "0"
          : `${formatNumero(diferencias)} · ${formatMoneda(montoDiferencias)}`,
      ok: diferencias === 0,
    },
  ];

  return (
    <section className="rounded-xl bg-brand-primary p-5 text-white shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          <Plug aria-hidden className="size-4" />
          Sincronización con EnKontrol
        </h2>
        <span className="text-sm text-white/70">
          {datos.ultimoSync.slice(0, 10) === DEMO_TODAY ? "hoy" : "último"}{" "}
          {datos.ultimoSync.slice(11, 16)}
        </span>
      </div>
      <p className="mt-1 text-sm text-white/70">
        EnKontrol sigue siendo la contabilidad · conciliación{" "}
        {formatPorcentaje(datos.conciliacion)}
      </p>
      <ul className="mt-4 space-y-3">
        {elementos.map((e) => (
          <li key={e.etiqueta} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                e.ok
                  ? "bg-brand-secondary/25 text-brand-secondary"
                  : "bg-brand-cta/25 text-brand-cta",
              )}
            >
              {e.ok ? (
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
              ) : (
                <AlertTriangle aria-hidden className="size-3.5" />
              )}
            </span>
            <span>{e.etiqueta}</span>
            <span className="ml-auto font-semibold tabular-nums">{e.detalle}</span>
          </li>
        ))}
      </ul>
      {sincronizando ? (
        <div className="mt-4" role="status">
          <div className="h-2 rounded-full bg-white/15">
            <div
              className="h-2 rounded-full bg-brand-secondary transition-all duration-300"
              style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/70">{PASOS[paso]}</p>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          className="bg-brand-secondary text-white hover:bg-brand-secondary-alt"
          disabled={diferencias === 0}
          onClick={() => setVerDiferencias(true)}
        >
          Revisar diferencias
        </Button>
        {puedeSincronizar ? (
          <Button
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            disabled={sincronizando}
            onClick={() => setPaso(0)}
          >
            <RefreshCw aria-hidden className={cn(sincronizando && "animate-spin")} />
            Sincronizar ahora
          </Button>
        ) : null}
        <Link
          href="/integraciones"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-white hover:bg-white/10 hover:text-white",
          )}
        >
          Ver integraciones
        </Link>
      </div>
      <DialogoDiferencias
        abierto={verDiferencias}
        onAbiertoChange={setVerDiferencias}
        diferencias={datos.diferencias}
        folios={folios}
      />
    </section>
  );
}
