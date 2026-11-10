"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { ContenidoSidebar } from "./sidebar";

/**
 * Drawer de navegación para anchos menores a `lg` (iPad en vertical). Reutiliza el
 * `Dialog` (foco atrapado, Esc y clic fuera cierran). Que sea drawer o sidebar fijo lo
 * decide solo el CSS: el botón vive `lg:hidden` y el sidebar fijo `hidden lg:flex`.
 */
export function MenuMovil() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  // Cierra al navegar, también cuando la ruta cambia por otra vía (atrás, buscador).
  // Se ajusta el estado durante el render (patrón de React) en vez de en un efecto.
  const [rutaPrevia, setRutaPrevia] = useState(ruta);
  if (ruta !== rutaPrevia) {
    setRutaPrevia(ruta);
    setAbierto(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label="Abrir menú"
        className="size-11 shrink-0 lg:hidden"
        onClick={() => setAbierto(true)}
      >
        <Menu aria-hidden />
      </Button>
      <DialogPortal>
        <DialogOverlay data-no-imprimir className="lg:hidden" />
        <DialogPrimitive.Popup
          aria-label="Menú principal"
          data-no-imprimir
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar pl-[env(safe-area-inset-left)] text-sidebar-foreground duration-150 outline-none lg:hidden data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left"
        >
          <DialogPrimitive.Close
            aria-label="Cerrar menú"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10 flex size-11 items-center justify-center rounded-lg text-white/85 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X aria-hidden className="size-5" />
          </DialogPrimitive.Close>
          <ContenidoSidebar onNavegar={() => setAbierto(false)} />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
