import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION, DURACION_SESION_MS, firmarSesion } from "@/server/auth/sesion";
import { GET } from "./route";
import { PUT } from "./usuario-activo/route";

/** Entorno ficticio: nunca las claves reales de la demo. */
const SECRETO = "x".repeat(32);
const CLAVE_RASEK = "r".repeat(32);
const CLAVE_SERGIO = "s".repeat(32);
const URL_SESION = "http://localhost/api/sesion";
const URL_ACTIVO = "http://localhost/api/sesion/usuario-activo";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRETO);
  vi.stubEnv("DEMO_CLAVE_RASEK", CLAVE_RASEK);
  vi.stubEnv("DEMO_CLAVE_SERGIO", CLAVE_SERGIO);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function cookieDe(cuenta: string, usuarioActivoId: string): string {
  const valor = firmarSesion(
    { cuenta, usuarioActivoId, exp: Date.now() + DURACION_SESION_MS },
    SECRETO,
  );
  return `${COOKIE_SESION}=${valor}`;
}

function peticion(
  url: string,
  metodo: string,
  { cookie, cuerpo }: { cookie?: string; cuerpo?: string } = {},
): Request {
  return new Request(url, {
    method: metodo,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: cuerpo,
  });
}

describe("GET /api/sesion", () => {
  it("con cookie válida responde la sesión; sin cookie, 401", async () => {
    const res = await GET(
      peticion(URL_SESION, "GET", { cookie: cookieDe("sergio", "usr-rasek") }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      usuarioId: "usr-rasek",
      cuentaUsuarioId: "usr-sergio",
      puedeSuplantar: true,
    });
    const sin = await GET(peticion(URL_SESION, "GET"));
    expect(sin.status).toBe(401);
    expect(await sin.json()).toEqual({ error: "SIN_SESION" });
  });

  it("sin secreto responde 500 sin detalle", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const res = await GET(peticion(URL_SESION, "GET"));
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("");
  });
});

describe("PUT /api/sesion/usuario-activo", () => {
  it("sin cookie da 401", async () => {
    const res = await PUT(
      peticion(URL_ACTIVO, "PUT", { cuerpo: JSON.stringify({ usuarioId: "usr-laura" }) }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "SIN_SESION" });
  });

  it("con la cookie de rasek da 403 sin Set-Cookie", async () => {
    const res = await PUT(
      peticion(URL_ACTIVO, "PUT", {
        cookie: cookieDe("rasek", "usr-rasek"),
        cuerpo: JSON.stringify({ usuarioId: "usr-laura" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "SIN_PERMISO" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("con la cookie de sergio, cuerpo malformado da 400 PETICION_INVALIDA", async () => {
    for (const cuerpo of ["{", JSON.stringify({ usuarioId: 7 })]) {
      const res = await PUT(
        peticion(URL_ACTIVO, "PUT", { cookie: cookieDe("sergio", "usr-sergio"), cuerpo }),
      );
      expect(res.status, cuerpo).toBe(400);
      expect(await res.json()).toEqual({ error: "PETICION_INVALIDA" });
    }
  });

  it("con un usuarioId inexistente da 400 USUARIO_DESCONOCIDO", async () => {
    const res = await PUT(
      peticion(URL_ACTIVO, "PUT", {
        cookie: cookieDe("sergio", "usr-sergio"),
        cuerpo: JSON.stringify({ usuarioId: "usr-fantasma" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "USUARIO_DESCONOCIDO" });
  });

  it("sergio cambia a Patricia y la cookie se renueva", async () => {
    const res = await PUT(
      peticion(URL_ACTIVO, "PUT", {
        cookie: cookieDe("sergio", "usr-sergio"),
        cuerpo: JSON.stringify({ usuarioId: "usr-patricia" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      usuarioId: "usr-patricia",
      cuentaUsuarioId: "usr-sergio",
      puedeSuplantar: true,
    });
    expect(res.headers.get("set-cookie")).toContain("Max-Age=604800");
  });
});
