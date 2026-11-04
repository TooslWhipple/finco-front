import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Marco del portal: sidebar fijo, topbar y área de contenido con scroll propio. */
export function ShellPortal({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen min-w-[1100px] overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
