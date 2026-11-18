"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStoreHidratado } from "@/store";
import { useHidratarStore } from "@/store/hidratar";
import { useSesionStore } from "@/store/sesion";

/**
 * Guard del portal: pide la sesión al servidor y, si no hay una válida
 * (cualquier respuesta distinta de 200), manda a `/login`. La barrera de rutas
 * la pone el proxy del servidor.
 *
 * El árbol se renderiza siempre (también en el servidor) para que Next pueda
 * validar la navegación instantánea de cada segmento; si no, lo descarta. Queda
 * oculto hasta que el store leyó localStorage y la sesión está cargada, y la
 * `key` lo vuelve a montar en ese momento: así ningún estado inicial de las
 * pantallas se calcula con los datos sin hidratar.
 */
export function GuardPortal({ children }: { children: ReactNode }) {
  useHidratarStore();
  const hidratado = useStoreHidratado();
  const cargada = useSesionStore((s) => s.cargada);
  const conSesion = useSesionStore((s) => s.usuarioId != null);
  const cargar = useSesionStore((s) => s.cargar);
  const router = useRouter();
  const listo = hidratado && cargada && conSesion;

  useEffect(() => {
    void cargar().then((hay) => {
      if (!hay) router.replace("/login");
    });
  }, [cargar, router]);

  return (
    <div key={listo ? "listo" : "cargando"} hidden={!listo} className="contents">
      {children}
    </div>
  );
}
