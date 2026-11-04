"use client";

import { useEffect } from "react";
import { useAppStore } from "./index";

/** Dispara la rehidratación desde localStorage una vez montado el cliente. */
export function useHidratarStore(): void {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);
}
