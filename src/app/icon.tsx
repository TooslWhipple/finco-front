import { iconoApp } from "@/lib/icono-app";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return iconoApp(size.width, 0.05);
}
