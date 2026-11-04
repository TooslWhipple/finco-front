"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/hooks";
import { useStoreHidratado } from "@/store";
import { useHidratarStore } from "@/store/hidratar";

/**
 * Guard del portal: sin sesión manda a `/login`. No pinta nada hasta que el
 * store leyó localStorage, para no desajustar la hidratación.
 */
export function GuardPortal({ children }: { children: ReactNode }) {
  useHidratarStore();
  const hidratado = useStoreHidratado();
  const { rol } = useSesion();
  const router = useRouter();
  const conSesion = rol != null;

  useEffect(() => {
    if (hidratado && !conSesion) router.replace("/login");
  }, [hidratado, conSesion, router]);

  return hidratado && conSesion ? children : null;
}
