"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { CLASE_SELECT } from "@/features/cotizacion/campo";
import {
  ETIQUETA_UNIDAD,
  catalogoEditable,
  type ConceptoLicitacion,
  type Licitacion,
  type UnidadObra,
} from "@/domain";
import { formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  capturaDeCatalogo,
  catalogoDeCaptura,
  siguienteIdConcepto,
  validarCatalogo,
  type CapturaConcepto,
} from "./esquemas";

const UNIDADES = Object.keys(ETIQUETA_UNIDAD) as UnidadObra[];

interface DialogoCatalogoProps {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  licitacion: Licitacion;
  onGuardar: (conceptos: ConceptoLicitacion[]) => void;
}

function CatalogoSoloLectura({ licitacion }: { licitacion: Licitacion }) {
  return (
    <ul className="divide-y divide-brand-line rounded-xl border border-brand-line">
      {licitacion.conceptos.map((c) => (
        <li key={c.id} className="flex items-baseline justify-between gap-3 p-3">
          <span className="min-w-0">
            <span className="block text-xs font-medium text-brand-text-muted">
              {c.clave}
            </span>
            <span className="block text-sm text-brand-primary">{c.descripcion}</span>
          </span>
          <span className="shrink-0 text-sm text-brand-text tabular-nums">
            {formatNumero(c.volumen)} {ETIQUETA_UNIDAD[c.unidad]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FormularioCatalogo({
  licitacion,
  onGuardar,
  onCerrar,
}: Omit<DialogoCatalogoProps, "abierto" | "onCambioAbierto"> & { onCerrar: () => void }) {
  const [filas, setFilas] = useState<CapturaConcepto[]>(() =>
    licitacion.conceptos.length > 0
      ? capturaDeCatalogo(licitacion.conceptos)
      : [
          {
            id: siguienteIdConcepto(licitacion.id, []),
            clave: "",
            descripcion: "",
            unidad: "M2",
            volumen: "",
          },
        ],
  );
  const [intentado, setIntentado] = useState(false);
  const errores = validarCatalogo(licitacion, filas);
  const hayErrores =
    errores.general !== undefined || Object.keys(errores.conceptos).length > 0;
  const cambiar = (id: string, parche: Partial<CapturaConcepto>) =>
    setFilas((previas) => previas.map((f) => (f.id === id ? { ...f, ...parche } : f)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (hayErrores) return;
        onGuardar(catalogoDeCaptura(filas));
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Catálogo de {licitacion.folio}</DialogTitle>
        <DialogDescription>
          Conceptos y volúmenes que cotizan los proveedores por precio unitario. Se puede
          editar hasta que llegue la primera respuesta con precios.
        </DialogDescription>
      </DialogHeader>
      <ul className="space-y-3">
        {filas.map((fila, i) => {
          const error = intentado ? errores.conceptos[fila.id] : undefined;
          const base = `catalogo-${fila.id}`;
          return (
            <li
              key={fila.id}
              className={cn(
                "space-y-2 rounded-xl border p-3",
                error ? "border-brand-danger" : "border-brand-line",
              )}
            >
              <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <Input
                  id={`${base}-clave`}
                  aria-label={`Clave del concepto ${i + 1}`}
                  placeholder="ACA-01"
                  value={fila.clave}
                  onChange={(e) => cambiar(fila.id, { clave: e.target.value })}
                  className="h-11 text-base md:text-base"
                />
                <Input
                  id={`${base}-descripcion`}
                  aria-label={`Descripción del concepto ${i + 1}`}
                  placeholder="Descripción"
                  value={fila.descripcion}
                  onChange={(e) => cambiar(fila.id, { descripcion: e.target.value })}
                  className="h-11 text-base md:text-base"
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2">
                <Input
                  id={`${base}-volumen`}
                  aria-label={`Volumen del concepto ${i + 1}`}
                  inputMode="decimal"
                  placeholder="Volumen"
                  value={fila.volumen}
                  onChange={(e) => cambiar(fila.id, { volumen: e.target.value })}
                  className="h-11 text-base md:text-base"
                />
                <select
                  aria-label={`Unidad del concepto ${i + 1}`}
                  className={cn(CLASE_SELECT, "h-11 text-base md:text-base")}
                  value={fila.unidad}
                  onChange={(e) =>
                    cambiar(fila.id, { unidad: e.target.value as UnidadObra })
                  }
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {ETIQUETA_UNIDAD[u]}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="size-11"
                  aria-label={`Quitar el concepto ${i + 1}`}
                  onClick={() =>
                    setFilas((previas) => previas.filter((f) => f.id !== fila.id))
                  }
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>
              {error ? (
                <p role="alert" className="text-xs text-brand-danger">
                  {error}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() =>
          setFilas((previas) => [
            ...previas,
            {
              id: siguienteIdConcepto(licitacion.id, previas),
              clave: "",
              descripcion: "",
              unidad: "M2",
              volumen: "",
            },
          ])
        }
      >
        <Plus aria-hidden className="size-4" />
        Agregar concepto
      </Button>
      {intentado && errores.general ? (
        <p role="alert" className="text-sm text-brand-danger">
          {errores.general}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onCerrar}>
          Volver
        </Button>
        <Button
          type="submit"
          className="h-11 bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          Guardar catálogo
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Catálogo de conceptos de la licitación: la PMO lo arma o edita mientras ninguna
 * ronda tenga precios; después queda en solo lectura.
 */
export function DialogoCatalogo({
  abierto,
  onCambioAbierto,
  licitacion,
  onGuardar,
}: DialogoCatalogoProps) {
  const cerrar = () => onCambioAbierto(false);
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {catalogoEditable(licitacion) ? (
          <FormularioCatalogo
            licitacion={licitacion}
            onGuardar={onGuardar}
            onCerrar={cerrar}
          />
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Catálogo de {licitacion.folio}</DialogTitle>
              <DialogDescription>
                Ya hay respuestas con precios: el catálogo queda en solo lectura.
              </DialogDescription>
            </DialogHeader>
            <CatalogoSoloLectura licitacion={licitacion} />
            <DialogFooter>
              <Button type="button" variant="outline" className="h-11" onClick={cerrar}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
