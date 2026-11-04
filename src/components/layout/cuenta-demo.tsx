"use client";

import { useRouter } from "next/navigation";
import { Check, LogOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ETIQUETA_ROL, USUARIOS_DEMO } from "@/config/usuarios";
import type { Rol } from "@/domain";
import { useSesion } from "@/hooks";
import { useAppStore } from "@/store";
import { AvatarUsuario } from "./avatar-usuario";

/**
 * Selector de rol: cambia de usuario en vivo y conserva la ruta actual: todas las
 * secciones se ven con cualquier rol, lo que cambia son las acciones.
 */
export function SelectorRol() {
  const { rol } = useSesion();
  const cambiarRol = useAppStore((s) => s.cambiarRol);

  const elegir = (nuevo: Rol) => {
    if (nuevo === rol) return;
    cambiarRol(nuevo);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-10 px-3">
            Rol: {rol ? ETIQUETA_ROL[rol] : "—"} <span aria-hidden>▾</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cambiar de rol</DropdownMenuLabel>
          {USUARIOS_DEMO.map((u) => (
            <DropdownMenuItem key={u.id} onClick={() => elegir(u.rol)}>
              <span className="flex-1">
                {ETIQUETA_ROL[u.rol]}
                <span className="block text-xs text-muted-foreground">{u.nombre}</span>
              </span>
              {u.rol === rol ? <Check aria-label="Rol actual" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Menú de usuario: cerrar sesión y reiniciar la demo. */
export function MenuUsuario() {
  const router = useRouter();
  const { usuario } = useSesion();
  const cerrarSesion = useAppStore((s) => s.cerrarSesion);
  const resetDemo = useAppStore((s) => s.resetDemo);

  /** Restablece los datos sin navegar: la pantalla actual se repinta con el estado inicial. */
  const reiniciar = () => {
    resetDemo();
    toast.success("Demo reiniciada al estado inicial");
  };

  const salir = () => {
    cerrarSesion();
    router.replace("/login");
  };

  if (!usuario) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <AvatarUsuario nombre={usuario.nombre} className="size-10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-sm font-medium text-foreground">
              {usuario.nombre}
            </span>
            {usuario.cargo}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={reiniciar}>
          <RotateCcw /> Reiniciar demo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={salir}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
