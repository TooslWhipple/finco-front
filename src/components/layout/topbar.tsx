import { Breadcrumb } from "./breadcrumb";
import { Buscador } from "./buscador";
import { Campana } from "./campana";
import { MenuMovil } from "./menu-movil";
import { MenuUsuario, SelectorRol } from "./cuenta-demo";
import { PildoraSync } from "./pildora-sync";

export function Topbar() {
  return (
    <div
      data-no-imprimir
      className="flex h-[calc(5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 border-b border-brand-line bg-white pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] lg:gap-4 lg:pr-[max(1.5rem,env(safe-area-inset-right))] lg:pl-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <MenuMovil />
        <Breadcrumb />
      </div>
      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        <Buscador />
        <PildoraSync />
        <SelectorRol />
        <Campana />
        <MenuUsuario />
      </div>
    </div>
  );
}
