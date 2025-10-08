// theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from "react";

// --- Define your theme colors here ---
const colors = {
  background: "#FFFFFF",
  text: "#111827",
  card: "#F5F5F5",
  border: "#E5E7EB",
  primary: "#2ecc71",
  secondary: "#6B7280",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
};

// --- Types ---
type ThemeContextType = {
  colors: typeof colors;
};

// --- Context ---
const ThemeCtx = createContext<ThemeContextType | null>(null);

// --- Provider ---
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeContextType>(() => ({ colors }), []);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

// --- Hook ---
export const useTheme = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};
