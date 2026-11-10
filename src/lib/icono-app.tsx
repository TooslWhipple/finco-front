import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/** Mismo valor que `--brand-primary` en globals.css. */
export const COLOR_MARCA = "#022f34";

/**
 * Ícono de la app: el logo de Finco centrado sobre `brand-primary`.
 * PROVISIONAL: se reemplaza `public/brand/logo.png` por el isotipo cuando llegue
 * (SVG o PNG de al menos 512 px); nada más cambia.
 *
 * `margen` es la fracción del lado que se deja libre a cada costado; con 0.2 el
 * logo cae dentro de la zona segura de la máscara de iOS y de la `maskable`.
 */
export async function iconoApp(lado: number, margen = 0.2) {
  const logo = await readFile(path.join(process.cwd(), "public/brand/logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  const ancho = Math.round(lado * (1 - margen * 2));
  const alto = Math.round(ancho * (143 / 506));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLOR_MARCA,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse no usa next/image */}
      <img src={src} width={ancho} height={alto} alt="" />
    </div>,
    { width: lado, height: lado },
  );
}
