"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";

type Theme = "light" | "dark";

const storageKey = "health_front_theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem(storageKey) as Theme | null;
    return saved === "dark" || saved === "light" ? saved : getSystemTheme();
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const label = useMemo(() => {
    return theme === "dark" ? "Light mode" : "Dark mode";
  }, [theme]);

  function handleToggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  return (
    <Button
      variant="ghost"
      onClick={handleToggle}
      aria-label={label}
      leftIcon={
        theme === "dark" ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      }
    >
      {label}
    </Button>
  );
}

