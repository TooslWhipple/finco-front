"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { itemActivo, itemsVisibles } from "@/config/navigation";
import { useBadges, useSesion } from "@/hooks";
import { cn } from "@/lib/utils";
import { AvatarUsuario } from "./avatar-usuario";

/** Sidebar fijo desde `lg`; debajo de `lg` lo reemplaza el drawer de `MenuMovil`. */
export function Sidebar() {
  return (
    <aside
      data-no-imprimir
      className="hidden h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex"
    >
      <ContenidoSidebar />
    </aside>
  );
}

/** Logo, navegación y usuario. `onNavegar` permite al drawer cerrarse al elegir un destino. */
export function ContenidoSidebar({ onNavegar }: { onNavegar?: () => void }) {
  const ruta = usePathname();
  const { usuario } = useSesion();
  const badges = useBadges();
  const grupos = usuario ? itemsVisibles(usuario.rol) : [];

  return (
    <>
      <div className="px-6 pt-[max(1.75rem,env(safe-area-inset-top))] pb-5">
        <Link href="/" aria-label="Ir al inicio" onClick={onNavegar}>
          <Image
            src="/brand/logo.png"
            alt="Plazas Finco"
            width={140}
            height={40}
            priority
            style={{ height: "auto" }}
          />
        </Link>
        <p className="mt-2 text-[0.7rem] font-medium tracking-[0.2em] text-white/80 uppercase">
          Portal de plazas
        </p>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {grupos.map((grupo) => {
          return (
            <div key={grupo.id}>
              <p className="px-3 pb-2 text-[0.7rem] font-medium tracking-[0.18em] text-white/60 uppercase">
                {grupo.titulo}
              </p>
              <ul className="space-y-1">
                {grupo.items.map((item) => {
                  const activo = itemActivo(item, ruta);
                  const cuenta = item.badge ? badges[item.badge] : 0;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.ruta}
                        aria-current={activo ? "page" : undefined}
                        onClick={onNavegar}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                          activo
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-white/85 hover:bg-white/10",
                        )}
                      >
                        <item.icono className="size-5 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{item.etiqueta}</span>
                        {cuenta > 0 ? (
                          <span className="rounded-full bg-brand-cta px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                            {cuenta}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/15 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {usuario ? (
          <div className="flex items-center gap-3">
            <AvatarUsuario nombre={usuario.nombre} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{usuario.nombre}</p>
              <p className="truncate text-xs text-white/70">{usuario.cargo}</p>
            </div>
          </div>
        ) : null}
        <p className="mt-3 text-[0.7rem] text-white/60">
          Finco · Portal de Plazas · by Whipple
        </p>
      </div>
    </>
  );
}
