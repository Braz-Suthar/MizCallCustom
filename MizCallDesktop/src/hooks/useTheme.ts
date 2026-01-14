import { useState, useEffect } from "react";

export type Theme = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("mizcall.theme");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {}
    return "system";
  });

  const [systemPref, setSystemPref] = useState<EffectiveTheme>(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemPref(e.matches ? "dark" : "light");
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("mizcall.theme", newTheme);
    } catch {}
  };

  const effectiveTheme: EffectiveTheme = theme === "system" ? systemPref : theme;

  return { theme, setTheme, effectiveTheme };
};
