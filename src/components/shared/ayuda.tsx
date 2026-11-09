"use client";

import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AyudaProps {
  /** Explicación en lenguaje llano que muestra el tooltip. */
  texto: string;
  /** Etiqueta que acompaña al ícono "?" (por ejemplo, el nombre del indicador). */
  children?: ReactNode;
  className?: string;
}

/** Ícono "?" con tooltip que explica un término; con `children`, los muestra antes del ícono. */
export function Ayuda({ texto, children, className }: AyudaProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {children}
      <Tooltip>
        <TooltipTrigger
          aria-label={`Qué significa: ${texto}`}
          className="inline-flex rounded-full text-brand-text-muted outline-none hover:text-brand-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CircleHelp aria-hidden className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>{texto}</TooltipContent>
      </Tooltip>
    </span>
  );
}
