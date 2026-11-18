"use client";

import { usePathname } from "next/navigation";
import { Check, LogOut, RotateCcw, Undo2 } from "lucide-react";
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
import { rutaPermitida } from "@/config/acceso-rutas";
import { INICIO_POR_ROL } from "@/config/permissions";
import { ETIQUETA_ROL, USUARIOS_DEMO, usuarioPorId } from "@/config/usuarios";
import type { Usuario } from "@/domain";
import { useSesion } from "@/hooks";
import { useAppStore } from "@/store";
import { useSesionStore } from "@/store/sesion";
import { AvatarUsuario } from "./avatar-usuario";

/**
 * Selector de rol: solo para la cuenta que puede suplantar (las demás no lo
 * ven). Pide al servidor ver la demo como otro usuario (también entre dos del
 * mismo rol, como los vendedores) y recarga en la ruta actual si el rol nuevo
 * la abre, o en su inicio (`INICIO_POR_ROL`) si no. La recarga completa
 * descarta lo que el router guardó con el rol anterior.
 */
export function SelectorRol() {
  const ruta = usePathname();
  const { usuario, rol, puedeSuplantar, cuentaUsuarioId } = useSesion();
  const suplantar = useSesionStore((s) => s.suplantar);

  if (!puedeSuplantar) return null;

  const cuenta = usuarioPorId(cuentaUsuarioId);
  const suplantando = cuenta != null && cuenta.id !== usuario?.id;

  const elegir = async (nuevo: Usuario) => {
    if (nuevo.id === usuario?.id) return;
    if (!(await suplantar(nuevo.id))) {
      toast.error("No se pudo cambiar de usuario, intenta de nuevo");
      return;
    }
    window.location.assign(
      rutaPermitida(nuevo.rol, ruta) ? ruta : INICIO_POR_ROL[nuevo.rol],
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-11 px-3">
            Rol: {rol ? ETIQUETA_ROL[rol] : "—"} <span aria-hidden>▾</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {suplantando ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => void elegir(cuenta)}>
                <Undo2 />
                <span className="flex-1">
                  Volver a mi cuenta
                  <span className="block text-xs text-muted-foreground">
                    {cuenta.nombre}
                  </span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cambiar de rol</DropdownMenuLabel>
          {USUARIOS_DEMO.map((u) => (
            <DropdownMenuItem key={u.id} onClick={() => void elegir(u)}>
              <span className="flex-1">
                {ETIQUETA_ROL[u.rol]}
                <span className="block text-xs text-muted-foreground">{u.nombre}</span>
              </span>
              {u.id === usuario?.id ? <Check aria-label="Usuario actual" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Menú de usuario: cerrar sesión y reiniciar la demo. */
export function MenuUsuario() {
  const { usuario } = useSesion();
  const cerrar = useSesionStore((s) => s.cerrar);
  const resetDemo = useAppStore((s) => s.resetDemo);

  /** Restablece los datos sin navegar: la pantalla actual se repinta con el estado inicial. */
  const reiniciar = () => {
    resetDemo();
    toast.success("Demo reiniciada al estado inicial");
  };

  /** Borra la cookie en el servidor y recarga en el login. */
  const salir = async () => {
    await cerrar();
    window.location.assign(new URL("/login", window.location.origin).href);
  };

  if (!usuario) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <AvatarUsuario nombre={usuario.nombre} className="size-11" />
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
        <DropdownMenuItem onClick={() => void salir()}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
