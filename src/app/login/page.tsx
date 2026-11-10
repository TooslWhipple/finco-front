"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AvatarUsuario } from "@/components/layout/avatar-usuario";
import { INICIO_POR_ROL } from "@/config/permissions";
import { ETIQUETA_ROL, USUARIOS_DEMO } from "@/config/usuarios";
import { useSesion } from "@/hooks";
import { useAppStore, useStoreHidratado } from "@/store";
import { useHidratarStore } from "@/store/hidratar";

export default function Login() {
  useHidratarStore();
  const hidratado = useStoreHidratado();
  const { rol } = useSesion();
  const router = useRouter();
  const iniciarSesion = useAppStore((s) => s.iniciarSesion);

  // Con sesión abierta no hay nada que hacer aquí.
  useEffect(() => {
    if (hidratado && rol) router.replace(INICIO_POR_ROL[rol]);
  }, [hidratado, rol, router]);

  return (
    <main className="grid min-h-dvh flex-1 grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col justify-between gap-8 bg-brand-primary p-8 text-white lg:p-12">
        <Image
          src="/brand/logo.png"
          alt="Plazas Finco"
          width={200}
          height={57}
          priority
          style={{ height: "auto" }}
        />
        <div>
          <h1 className="font-heading text-4xl leading-tight font-bold">
            Portal de Plazas
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Precios, contratos y cobranza de tus plazas en un solo lugar, con una sola
            versión de la verdad.
          </p>
        </div>
        <p className="text-sm text-white/60">Prototipo demostrativo · by Whipple</p>
      </section>

      <section className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <h2 className="font-heading text-2xl font-bold text-brand-primary">
            Entrar como…
          </h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Elige un usuario de prueba. Cada rol ve un menú, permisos y pantalla de inicio
            distintos; podrás cambiar de rol en cualquier momento desde la barra superior.
          </p>
          <ul className="mt-6 space-y-3">
            {USUARIOS_DEMO.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={!hidratado}
                  onClick={() => {
                    iniciarSesion(u.id);
                    router.push(INICIO_POR_ROL[u.rol]);
                  }}
                  className="group flex w-full items-center gap-4 rounded-xl border border-brand-line bg-card p-4 text-left shadow-xs transition-colors outline-none hover:border-brand-secondary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <AvatarUsuario nombre={u.nombre} className="size-11" />
                  <span className="flex-1">
                    <span className="block font-medium text-brand-text">{u.nombre}</span>
                    <span className="block text-sm text-brand-text-muted">
                      {u.cargo} · rol {ETIQUETA_ROL[u.rol]}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-5 text-brand-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-cta"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
