import { describe, expect, it } from "vitest";
import { claveDeEnlace } from "./enlace";

describe("claveDeEnlace", () => {
  it("devuelve la clave de un enlace completo con espacios alrededor", () => {
    expect(claveDeEnlace("  https://demo.finco.app/acceso/abc123  ")).toBe("abc123");
  });

  it("corta la clave en el primer /, ? o #", () => {
    expect(claveDeEnlace("https://demo.finco.app/acceso/abc123/extra")).toBe("abc123");
    expect(claveDeEnlace("https://demo.finco.app/acceso/abc123?x=1")).toBe("abc123");
    expect(claveDeEnlace("https://demo.finco.app/acceso/abc123#seccion")).toBe("abc123");
  });

  it("devuelve null si el enlace no trae clave", () => {
    expect(claveDeEnlace("https://demo.finco.app/acceso/")).toBeNull();
    expect(claveDeEnlace("https://demo.finco.app/acceso/#seccion")).toBeNull();
  });

  it("devuelve el texto recortado si no trae /acceso/", () => {
    expect(claveDeEnlace("  abc123 ")).toBe("abc123");
  });

  it("devuelve null con texto vacío o solo espacios", () => {
    expect(claveDeEnlace("")).toBeNull();
    expect(claveDeEnlace("   ")).toBeNull();
  });
});
