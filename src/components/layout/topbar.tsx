import { Breadcrumb } from "./breadcrumb";
import { Buscador } from "./buscador";
import { Campana } from "./campana";
import { MenuUsuario, SelectorRol } from "./cuenta-demo";
import { PildoraSync } from "./pildora-sync";

export function Topbar() {
  return (
    <div className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-brand-line bg-white px-6">
      <Breadcrumb />
      <div className="flex shrink-0 items-center gap-3">
        <Buscador />
        <PildoraSync />
        <SelectorRol />
        <Campana />
        <MenuUsuario />
      </div>
    </div>
  );
}
