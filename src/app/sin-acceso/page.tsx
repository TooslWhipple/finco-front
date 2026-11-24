import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FormularioEnlace } from "@/features/acceso/formulario-enlace";

/**
 * Pantalla pública sin sesión: el portal se abre con el enlace de cada cuenta.
 * El campo cubre la app instalada (que no comparte cookies con el navegador) y
 * la sesión vencida.
 */
export default function SinAcceso() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 bg-brand-primary p-6">
      <Image
        src="/brand/logo.png"
        alt="Plazas Finco"
        width={506}
        height={143}
        sizes="200px"
        loading="eager"
        className="h-auto w-50"
      />
      <h1 className="sr-only">Portal de Plazas</h1>
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-lg">
        <EmptyState
          icono={LockKeyhole}
          titulo="Entra con tu enlace"
          descripcion="Este portal se abre con el enlace que te compartieron. Ábrelo o pégalo aquí."
          accion={<FormularioEnlace />}
        />
      </div>
    </main>
  );
}
