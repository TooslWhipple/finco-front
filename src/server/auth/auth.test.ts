import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decidirAcceso } from "./acceso";
import { cuentaPorUsuario, verificarCredenciales } from "./cuentas";
import {
  firmarSesion,
  leerSesion,
  secretoSesion,
  sesionDeCookie,
  sesionValida,
  valorCookie,
  COOKIE_SESION,
  DURACION_SESION_MS,
} from "./sesion";
import type { SesionFirmada } from "./tipos";

/** Entorno ficticio: nunca las contraseñas reales de la demo. */
const ENV = {
  SESSION_SECRET: "x".repeat(32),
  DEMO_PASSWORD_RASEK: "clave-de-prueba",
  DEMO_PASSWORD_BENJAMIN: "clave-de-benjamin",
  DEMO_PASSWORD_SERGIO: "otra-clave-de-prueba",
};
const SECRETO = ENV.SESSION_SECRET;
const AHORA = 1_800_000_000_000;

const rasek: SesionFirmada = {
  cuenta: "rasek",
  usuarioActivoId: "usr-rasek",
  exp: AHORA + DURACION_SESION_MS,
};

describe("secretoSesion", () => {
  it("lanza sin secreto o con uno corto", () => {
    expect(() => secretoSesion({})).toThrow();
    expect(() => secretoSesion({ SESSION_SECRET: "corto" })).toThrow();
    expect(secretoSesion(ENV)).toBe(SECRETO);
  });
});

describe("firma de la sesión", () => {
  const valor = firmarSesion(rasek, SECRETO);

  it("una cookie bien firmada y vigente se lee igual", () => {
    expect(leerSesion(valor, SECRETO, AHORA)).toEqual(rasek);
  });

  it("firma alterada, recortada, otro secreto o vencida dan null sin lanzar", () => {
    const [payload, firma] = valor.split(".") as [string, string];
    const otraLetra = firma.startsWith("A") ? "B" : "A";
    expect(
      leerSesion(`${payload}.${otraLetra}${firma.slice(1)}`, SECRETO, AHORA),
    ).toBeNull();
    expect(leerSesion(`${payload}.${firma.slice(0, -4)}`, SECRETO, AHORA)).toBeNull();
    expect(leerSesion(valor.slice(0, 10), SECRETO, AHORA)).toBeNull();
    expect(leerSesion(`${payload}x.${firma}`, SECRETO, AHORA)).toBeNull();
    expect(leerSesion(valor, "y".repeat(32), AHORA)).toBeNull();
    expect(leerSesion(valor, SECRETO, rasek.exp)).toBeNull();
    expect(leerSesion(undefined, SECRETO, AHORA)).toBeNull();
    expect(leerSesion("a.b.c", SECRETO, AHORA)).toBeNull();
  });

  it("un payload bien firmado que no es una sesión da null", () => {
    const firmado = (texto: string) => {
      const payload = Buffer.from(texto).toString("base64url");
      return `${payload}.${createHmac("sha256", SECRETO).update(payload).digest("base64url")}`;
    };
    expect(leerSesion(firmado("no-es-json"), SECRETO, AHORA)).toBeNull();
    expect(leerSesion(firmado('{"cuenta":"rasek"}'), SECRETO, AHORA)).toBeNull();
    expect(leerSesion(firmado(JSON.stringify(rasek)), SECRETO, AHORA)).toEqual(rasek);
  });
});

describe("cuentas", () => {
  it("rasek con su contraseña entra sin poder suplantar; con trim y mayúsculas también", () => {
    expect(verificarCredenciales("rasek", "clave-de-prueba", ENV)).toMatchObject({
      usuarioId: "usr-rasek",
      puedeSuplantar: false,
    });
    expect(verificarCredenciales("  Rasek ", "clave-de-prueba", ENV)?.usuario).toBe(
      "rasek",
    );
  });

  it("benjamin entra con su contraseña, sin suplantar y con el mismo rol que rasek", () => {
    expect(verificarCredenciales("benjamin", "clave-de-benjamin", ENV)).toMatchObject({
      usuarioId: "usr-benjamin",
      puedeSuplantar: false,
    });
    expect(verificarCredenciales("benjamin", "clave-de-prueba", ENV)).toBeNull();
  });

  it("contraseña errónea, usuario desconocido o cuenta sin variable no entran", () => {
    expect(verificarCredenciales("rasek", "otra", ENV)).toBeNull();
    expect(verificarCredenciales("nadie", "clave-de-prueba", ENV)).toBeNull();
    expect(verificarCredenciales("rasek", "", { SESSION_SECRET: SECRETO })).toBeNull();
  });

  it("sergio puede suplantar", () => {
    expect(cuentaPorUsuario("sergio")?.puedeSuplantar).toBe(true);
  });
});

describe("validez de la sesión", () => {
  it("la sesión propia de rasek es válida; con un usuario activo ajeno no", () => {
    expect(sesionValida(rasek, ENV)).toBe(true);
    expect(sesionValida({ ...rasek, usuarioActivoId: "usr-mariana" }, ENV)).toBe(false);
  });

  it("sergio puede tener otro usuario activo, pero no uno inexistente", () => {
    const sergio = { cuenta: "sergio", usuarioActivoId: "usr-rasek", exp: rasek.exp };
    expect(sesionValida(sergio, ENV)).toBe(true);
    expect(sesionValida({ ...sergio, usuarioActivoId: "usr-fantasma" }, ENV)).toBe(false);
  });

  it("una cuenta sin su variable de contraseña ya no tiene sesión", () => {
    expect(sesionValida(rasek, { SESSION_SECRET: SECRETO })).toBe(false);
  });

  it("sesionDeCookie compone firma, cuenta y usuario; lanza sin secreto", () => {
    const valor = firmarSesion(rasek, SECRETO);
    expect(sesionDeCookie(valor, ENV, AHORA)).toMatchObject({
      sesion: rasek,
      usuario: { id: "usr-rasek", rol: "GERENTE_COMERCIAL" },
      cuenta: { usuario: "rasek" },
    });
    const ajena = firmarSesion({ ...rasek, usuarioActivoId: "usr-laura" }, SECRETO);
    expect(sesionDeCookie(ajena, ENV, AHORA)).toBeNull();
    expect(() => sesionDeCookie(valor, {}, AHORA)).toThrow();
  });

  it("valorCookie lee finco-sesion del header cookie", () => {
    const peticion = new Request("http://localhost/", {
      headers: { cookie: `otra=1; ${COOKIE_SESION}=abc.def; tercera=3` },
    });
    expect(valorCookie(peticion)).toBe("abc.def");
    expect(valorCookie(new Request("http://localhost/"))).toBeUndefined();
  });
});

describe("decidirAcceso", () => {
  it("sin sesión solo pasa /login", () => {
    expect(decidirAcceso("/login", null)).toEqual({ tipo: "pasar" });
    expect(decidirAcceso("/cotizaciones", null)).toEqual({
      tipo: "redirigir",
      a: "/login",
    });
    expect(decidirAcceso("/", null)).toEqual({ tipo: "redirigir", a: "/login" });
  });

  it("el Gerente comercial no abre cobranza (ni codificada) ni rutas sin dueño", () => {
    for (const ruta of [
      "/cobranza",
      "/%63obranza",
      "/ruta-inventada",
      "/terrenos-y-proyectos",
    ]) {
      expect(decidirAcceso(ruta, "GERENTE_COMERCIAL"), ruta).toEqual({
        tipo: "redirigir",
        a: "/resumen-comercial",
      });
    }
    expect(decidirAcceso("/%E0%A4%A", "GERENTE_COMERCIAL")).toEqual({
      tipo: "redirigir",
      a: "/resumen-comercial",
    });
    expect(decidirAcceso("/cotizaciones/x", "GERENTE_COMERCIAL")).toEqual({
      tipo: "pasar",
    });
  });

  it("con sesión, /login manda al inicio del rol", () => {
    expect(decidirAcceso("/login", "SUPERADMIN")).toEqual({
      tipo: "redirigir",
      a: "/precios-y-reglas",
    });
  });

  it("Dirección abre la impresión de un contrato", () => {
    expect(decidirAcceso("/contratos/x/imprimir", "DIRECCION")).toEqual({
      tipo: "pasar",
    });
  });
});
