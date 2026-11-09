"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { rutaPermitida } from "@/config/navigation";
import { INICIO_POR_ROL } from "@/config/permissions";
import { useSesion } from "@/hooks";

/**
 * Bloquea los módulos que el menú del rol no muestra (p. ej. por URL directa).
 * Va dentro del shell para que el selector de rol siga disponible.
 */
export function GuardRuta({ children }: { children: ReactNode }) {
  const { rol } = useSesion();
  const ruta = usePathname();

  if (rol && !rutaPermitida(rol, ruta)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Tu perfil no tiene acceso a esta sección"
        descripcion="Este módulo no forma parte del menú de tu rol."
        accion={
          <Link
            href={INICIO_POR_ROL[rol]}
            className={buttonVariants({ variant: "default" })}
          >
            Ir a mi inicio
          </Link>
        }
        className="py-24"
      />
    );
  }
  return children;
}
