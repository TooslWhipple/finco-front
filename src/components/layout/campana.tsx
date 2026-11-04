"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificaciones, useSesion } from "@/hooks";

export function Campana() {
  const { rol } = useSesion();
  const notificaciones = useNotificaciones(rol);
  const [abierto, setAbierto] = useState(false);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Notificaciones"
            className="relative size-10"
          >
            <Bell />
            {notificaciones.length > 0 ? (
              <span
                aria-label={`${notificaciones.length} avisos`}
                className="absolute top-2 right-2 size-2 rounded-full bg-brand-cta"
              />
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b border-brand-line px-4 py-3 font-heading text-sm font-semibold text-brand-primary">
          Notificaciones
        </p>
        {notificaciones.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brand-text-muted">
            Estás al día: no hay avisos pendientes.
          </p>
        ) : (
          <ul className="divide-y divide-brand-line">
            {notificaciones.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.ruta}
                  onClick={() => setAbierto(false)}
                  className="block px-4 py-3 transition-colors hover:bg-brand-cream"
                >
                  <p className="text-sm font-medium text-brand-text">{n.titulo}</p>
                  <p className="text-xs text-brand-text-muted">{n.detalle}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
