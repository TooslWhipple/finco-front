"use client";

import { useState } from "react";
import { useSesion } from "@/hooks";
import { can } from "@/config/permissions";
import {
  DEMO_TODAY,
  origenRegla,
  type Local,
  type Plaza,
  type ReglaActualizacion,
} from "@/domain";
import { describirRegla } from "@/features/plaza/resumen";
import { useAppStore } from "@/store";
import type { EntradaBitacora } from "@/store/reducers";
import { EditorRegla } from "./editor-regla";
import { PrecioCandados } from "./precio-candados";
import { Repricing } from "./repricing";

const SIN_BITACORA: readonly EntradaBitacora[] = [];

/**
 * Precio y candados, regla de actualización y repricing de un local, con la edición
 * reservada a Superadmin. La comparten la ficha del local y "Precios y reglas".
 */
export function PrecioReglaLocal({ local, plaza }: { local: Local; plaza: Plaza }) {
  const { usuario, rol } = useSesion();
  const bitacora =
    useAppStore((s) => s.locales.ajustes[local.id]?.bitacora) ?? SIN_BITACORA;
  const ajustarLocal = useAppStore((s) => s.ajustarLocal);
  const [borrador, setBorrador] = useState<ReglaActualizacion | null>(null);

  const autor = usuario?.nombre ?? "Sistema";
  const regla = borrador ?? local.regla;

  function guardarMinimo(precioMinimo: number, nuevaBitacora: EntradaBitacora[]) {
    ajustarLocal(local.id, { precioMinimo, bitacora: nuevaBitacora });
  }

  function guardarRegla() {
    if (!borrador) return;
    ajustarLocal(local.id, {
      regla: borrador,
      bitacora: [
        ...bitacora,
        {
          fecha: DEMO_TODAY,
          autor,
          titulo: "Regla de actualización modificada",
          detalle: `${describirRegla(local.regla)} → ${describirRegla(borrador)}`,
        },
      ],
    });
    setBorrador(null);
  }

  return (
    <div className="min-w-0 space-y-6">
      <PrecioCandados
        local={local}
        puedeEditar={can(rol, "precioMinimo.editar")}
        autor={autor}
        bitacora={bitacora}
        onGuardar={guardarMinimo}
      >
        <EditorRegla
          regla={regla}
          reglaGuardada={local.regla}
          reglaPlaza={plaza.reglaDefault}
          origen={origenRegla(local.regla, plaza.reglaDefault)}
          editable={can(rol, "regla.editar")}
          onCambiar={setBorrador}
          onGuardar={guardarRegla}
          onDescartar={() => setBorrador(null)}
        />
      </PrecioCandados>
      <Repricing local={local} regla={regla} />
    </div>
  );
}
