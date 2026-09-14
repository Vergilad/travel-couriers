import { useCallback, useEffect, useState } from "react";

export type ColorMode = "light" | "dark";

const STORAGE_KEY = "viactor-color-mode";

function readStored(): ColorMode | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

function systemMode(): ColorMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Colour mode for the marketing surface.
 *
 * Follows the operating system by default, and only stops following it once
 * the visitor has actually chosen a mode. That distinction matters: writing
 * the resolved system value to storage on first load would silently freeze the
 * choice, so someone who flips their laptop to dark at sunset would keep
 * getting the light page.
 */
export function useColorMode() {
  const [override, setOverride] = useState<ColorMode | null>(() => readStored());
  const [system, setSystem] = useState<ColorMode>(() => systemMode());

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystem(query.matches ? "dark" : "light");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const mode = override ?? system;

  const toggle = useCallback(() => {
    const next: ColorMode = mode === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    setOverride(next);
  }, [mode]);

  return { mode, toggle };
}
