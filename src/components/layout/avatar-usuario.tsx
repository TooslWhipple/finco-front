import { cn } from "@/lib/utils";
import { iniciales } from "./iniciales";

export function AvatarUsuario({
  nombre,
  className,
}: {
  nombre: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-xs font-bold text-white",
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}
