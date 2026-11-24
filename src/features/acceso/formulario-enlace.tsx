"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RUTA_ENLACE } from "@/config/acceso-rutas";
import { Campo } from "@/features/cotizacion/campo";
import { claveDeEnlace } from "./enlace";

/**
 * Campo para pegar el enlace (o solo la clave). Navega al mismo `GET /acceso/<clave>`
 * del enlace: la validación vive solo en el servidor.
 */
export function FormularioEnlace() {
  const [texto, setTexto] = useState("");
  const clave = claveDeEnlace(texto);

  const entrar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (clave === null) return;
    // Navegación completa: ningún prefetch del router sobrevive al cambio de sesión.
    const destino = new URL(
      `${RUTA_ENLACE}/${encodeURIComponent(clave)}`,
      window.location.origin,
    );
    window.location.assign(destino);
  };

  return (
    <form className="w-full max-w-md space-y-4 text-left" onSubmit={entrar} noValidate>
      <Campo etiqueta="Pega tu enlace" htmlFor="enlace-acceso">
        <Input
          id="enlace-acceso"
          name="enlace"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="h-11"
        />
      </Campo>
      <Button type="submit" className="h-11 w-full" disabled={clave === null}>
        Entrar
        <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}
