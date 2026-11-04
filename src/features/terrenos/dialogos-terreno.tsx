"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Campo, CLASE_SELECT } from "@/features/cotizacion/campo";
import { ETAPAS_TERRENO, ETIQUETA_ETAPA_TERRENO } from "@/domain";
import type { EtapaTerreno, Terreno } from "@/domain";

interface DialogoProps {
  terreno: Terreno;
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
}

function FormularioMover({
  terreno,
  onCerrar,
  onMover,
}: {
  terreno: Terreno;
  onCerrar: () => void;
  onMover: (id: string, etapa: EtapaTerreno) => void;
}) {
  const [etapa, setEtapa] = useState<EtapaTerreno>(terreno.etapa);
  const cambia = etapa !== terreno.etapa;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!cambia) return;
        onMover(terreno.id, etapa);
        toast.success(`${terreno.nombre} pasó a ${ETIQUETA_ETAPA_TERRENO[etapa]}`);
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Mover a etapa</DialogTitle>
        <DialogDescription>
          {terreno.nombre} está en {ETIQUETA_ETAPA_TERRENO[terreno.etapa]}. El avance de
          la nueva etapa arranca en 0%.
        </DialogDescription>
      </DialogHeader>
      <Campo
        etiqueta="Etapa destino"
        htmlFor="etapa-terreno"
        ayuda={
          etapa === "PREVENTA"
            ? "Aparecerá como plaza en preventa en el Mapa y en el Panorama."
            : undefined
        }
      >
        <select
          id="etapa-terreno"
          value={etapa}
          onChange={(e) => setEtapa(e.target.value as EtapaTerreno)}
          className={CLASE_SELECT}
        >
          {ETAPAS_TERRENO.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ETAPA_TERRENO[e]}
            </option>
          ))}
        </select>
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!cambia}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Mover
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DialogoMoverEtapa({
  terreno,
  abierto,
  onCambioAbierto,
  onMover,
}: DialogoProps & { onMover: (id: string, etapa: EtapaTerreno) => void }) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioMover
          terreno={terreno}
          onCerrar={() => onCambioAbierto(false)}
          onMover={onMover}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioAvance({
  terreno,
  onCerrar,
  onActualizar,
}: {
  terreno: Terreno;
  onCerrar: () => void;
  onActualizar: (id: string, avancePct: number) => void;
}) {
  const [texto, setTexto] = useState(String(terreno.avancePct));
  const valor = Number(texto);
  const error =
    texto.trim() === "" || !Number.isFinite(valor) || valor < 0 || valor > 100
      ? "Escribe un porcentaje entre 0 y 100."
      : undefined;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (error) return;
        onActualizar(terreno.id, valor);
        toast.success(`Avance de ${terreno.nombre} actualizado a ${Math.round(valor)}%`);
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Actualizar avance</DialogTitle>
        <DialogDescription>
          Avance de la etapa actual de {terreno.nombre}. El semáforo se recalcula contra
          la fecha objetivo.
        </DialogDescription>
      </DialogHeader>
      <Campo etiqueta="Avance (%)" htmlFor="avance-terreno" error={error}>
        <Input
          id="avance-terreno"
          type="number"
          min={0}
          max={100}
          step={1}
          inputMode="numeric"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={error !== undefined}
          className="bg-brand-cta text-white hover:bg-brand-cta-light"
        >
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DialogoActualizarAvance({
  terreno,
  abierto,
  onCambioAbierto,
  onActualizar,
}: DialogoProps & { onActualizar: (id: string, avancePct: number) => void }) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioAvance
          terreno={terreno}
          onCerrar={() => onCambioAbierto(false)}
          onActualizar={onActualizar}
        />
      </DialogContent>
    </Dialog>
  );
}
