"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INICIO_POR_ROL } from "@/config/permissions";
import { usuarioPorId } from "@/config/usuarios";
import { Campo } from "@/features/cotizacion/campo";
import { useSesionStore } from "@/store/sesion";

const MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos";
const MENSAJE_ERROR = "No se pudo iniciar sesión, intenta de nuevo";

/**
 * Login con usuario y contraseña, validado en el servidor (`/api/sesion`). Con
 * sesión abierta el proxy no deja llegar aquí: manda al inicio del rol.
 */
export default function Login() {
  const iniciar = useSesionStore((s) => s.iniciar);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const resultado = await iniciar(usuario, password);
    if (resultado.tipo === "ok") {
      const activo = usuarioPorId(resultado.sesion.usuarioId);
      // Navegación completa: ningún prefetch del router sobrevive al cambio de sesión.
      window.location.assign(activo ? INICIO_POR_ROL[activo.rol] : "/");
      return;
    }
    setError(resultado.tipo === "credenciales" ? MENSAJE_CREDENCIALES : MENSAJE_ERROR);
    setEnviando(false);
  };

  return (
    <main className="grid min-h-dvh flex-1 grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col justify-between gap-8 bg-brand-primary p-8 text-white lg:p-12">
        <Image
          src="/brand/logo.png"
          alt="Plazas Finco"
          width={506}
          height={143}
          sizes="200px"
          loading="eager"
          className="h-auto w-50"
        />
        <div>
          <h1 className="font-heading text-4xl leading-tight font-bold">
            Portal de Plazas
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Precios, disponibilidad y contratos de tus plazas en un solo lugar, con una
            sola versión de la verdad.
          </p>
        </div>
        <p className="text-sm text-white/60">Prototipo demostrativo · by Whipple</p>
      </section>

      <section className="flex items-center justify-center p-8 lg:p-12">
        <form className="w-full max-w-md" onSubmit={entrar} noValidate>
          <h2 className="font-heading text-2xl font-bold text-brand-primary">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Entra con el usuario y la contraseña que te compartió Whipple.
          </p>
          <div className="mt-6 space-y-4">
            <Campo etiqueta="Usuario" htmlFor="login-usuario">
              <Input
                id="login-usuario"
                name="usuario"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="h-11"
              />
            </Campo>
            <Campo etiqueta="Contraseña" htmlFor="login-password">
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </Campo>
            {error ? (
              <p role="alert" className="text-sm text-brand-danger">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={enviando || !usuario.trim() || !password}
            >
              {enviando ? "Entrando…" : "Entrar"}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
