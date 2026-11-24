import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION, sesionDeCookie } from "@/server/auth/sesion";
import { GET } from "./route";

/** Entorno ficticio: nunca las claves reales de la demo. */
const SECRETO = "x".repeat(32);
const CLAVE_RASEK = "r".repeat(32);
const CLAVE_SERGIO = "s".repeat(32);

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRETO);
  vi.stubEnv("DEMO_CLAVE_RASEK", CLAVE_RASEK);
  vi.stubEnv("DEMO_CLAVE_SERGIO", CLAVE_SERGIO);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function abrir(clave: string): Promise<Response> {
  return GET(new Request(`http://localhost/acceso/${clave}`), {
    params: Promise.resolve({ clave }),
  } as Parameters<typeof GET>[1]);
}

function destino(res: Response): string {
  return new URL(res.headers.get("location")!).pathname;
}

describe("GET /acceso/[clave]", () => {
  it("la clave de rasek redirige a /resumen-comercial con una cookie válida", async () => {
    const res = await abrir(CLAVE_RASEK);
    expect(res.status).toBe(303);
    expect(destino(res)).toBe("/resumen-comercial");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie).toContain("Max-Age=604800");
    const valor = setCookie.split(";")[0].slice(`${COOKIE_SESION}=`.length);
    const sesion = sesionDeCookie(valor);
    expect(sesion?.cuenta.usuarioId).toBe("usr-rasek");
  });

  it("la clave de sergio redirige a /precios-y-reglas", async () => {
    const res = await abrir(CLAVE_SERGIO);
    expect(res.status).toBe(303);
    expect(destino(res)).toBe("/precios-y-reglas");
  });

  it("una clave mala redirige a /sin-acceso sin cookie", async () => {
    const res = await abrir("clave-falsa");
    expect(res.status).toBe(303);
    expect(destino(res)).toBe("/sin-acceso");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("una cuenta sin clave configurada no entra", async () => {
    vi.stubEnv("DEMO_CLAVE_RASEK", "");
    const res = await abrir(CLAVE_RASEK);
    expect(destino(res)).toBe("/sin-acceso");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("sin SESSION_SECRET responde 500 sin cuerpo, incluso con una clave válida", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const res = await abrir(CLAVE_RASEK);
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("");
  });
});
