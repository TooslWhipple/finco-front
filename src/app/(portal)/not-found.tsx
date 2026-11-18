"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { INICIO_POR_ROL } from "@/config/permissions";
import { useSesion } from "@/hooks";

/**
 * Lo que pinta el portal cuando una pantalla llama a `notFound()` (p. ej. una
 * plaza o un local que no existen). Va dentro del shell, como `GuardRuta`, y
 * lleva al inicio del rol activo.
 */
export default function NoEncontrado() {
  const { rol } = useSesion();

  return (
    <EmptyState
      icono={SearchX}
      titulo="No encontramos esta página"
      descripcion="Puede que el enlace esté mal escrito o que el registro ya no exista."
      accion={
        <Link
          href={rol ? INICIO_POR_ROL[rol] : "/"}
          className={buttonVariants({ variant: "default" })}
        >
          Ir a mi inicio
        </Link>
      }
      className="py-24"
    />
  );
}
