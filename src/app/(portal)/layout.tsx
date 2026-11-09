import type { ReactNode } from "react";
import { ShellPortal } from "@/components/layout/shell-portal";
import { GuardRuta } from "@/components/layout/guard-ruta";
import { GuardPortal } from "@/components/layout/guard-portal";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <GuardPortal>
      <ShellPortal>
        <GuardRuta>{children}</GuardRuta>
      </ShellPortal>
    </GuardPortal>
  );
}
