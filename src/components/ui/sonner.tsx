"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!border-border !bg-popover !text-popover-foreground !font-sans !shadow-lg",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
