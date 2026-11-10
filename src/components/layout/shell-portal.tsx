import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Marco del portal: sidebar fijo, topbar y área de contenido con scroll propio. */
export function ShellPortal({ children }: { children: ReactNode }) {
  return (
    <div data-shell className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div data-shell className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          data-shell-main
          className="flex-1 overflow-y-auto px-4 pt-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
