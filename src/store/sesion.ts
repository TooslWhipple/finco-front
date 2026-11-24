"use client";

import { create } from "zustand";
import type { SesionDto } from "@/server/auth/tipos";

/**
 * Sesión del cliente. La fuente de verdad es la cookie firmada del servidor
 * (`/api/sesion`); este store solo guarda en memoria lo que respondió, sin
 * localStorage, así editarlo desde DevTools no da otro rol a nadie. No importa
 * `./index`: el store de datos lo lee con `useSesionStore.getState()`.
 */
export interface SesionCliente {
  /** Usuario demo que ve la pantalla (`null` sin sesión). */
  usuarioId: string | null;
  /** Usuario de la cuenta que se autenticó (distinto de `usuarioId` al suplantar). */
  cuentaUsuarioId: string | null;
  puedeSuplantar: boolean;
  /** Ya se preguntó al servidor (con o sin sesión). */
  cargada: boolean;
}

export interface AccionesSesion {
  /** Lee la sesión del servidor; no repite la petición si ya hay sesión. `true` si hay sesión. */
  cargar(): Promise<boolean>;
  /** Cambia el usuario activo (solo si la cuenta puede suplantar); `null` si el servidor lo niega. */
  suplantar(usuarioId: string): Promise<SesionDto | null>;
}

const SIN_SESION: SesionCliente = {
  usuarioId: null,
  cuentaUsuarioId: null,
  puedeSuplantar: false,
  cargada: true,
};

function desdeDto(sesion: SesionDto): SesionCliente {
  return {
    usuarioId: sesion.usuarioId,
    cuentaUsuarioId: sesion.cuentaUsuarioId,
    puedeSuplantar: sesion.puedeSuplantar,
    cargada: true,
  };
}

async function pedir(url: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    return null;
  }
}

export const useSesionStore = create<SesionCliente & AccionesSesion>()((set, get) => ({
  usuarioId: null,
  cuentaUsuarioId: null,
  puedeSuplantar: false,
  cargada: false,

  cargar: async () => {
    if (get().usuarioId) return true;
    const respuesta = await pedir("/api/sesion");
    if (respuesta?.status !== 200) {
      set(SIN_SESION);
      return false;
    }
    set(desdeDto((await respuesta.json()) as SesionDto));
    return true;
  },

  suplantar: async (usuarioId) => {
    const respuesta = await pedir("/api/sesion/usuario-activo", {
      method: "PUT",
      body: JSON.stringify({ usuarioId }),
    });
    if (respuesta?.status !== 200) return null;
    const sesion = (await respuesta.json()) as SesionDto;
    set(desdeDto(sesion));
    return sesion;
  },
}));
