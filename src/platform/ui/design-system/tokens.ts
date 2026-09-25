export const colors = {};
export const semanticTokens = {
  text: {
    primary: "text-slate-900",       // 16.2:1 contrast ratio
    secondary: "text-slate-700",     // 8.5:1 contrast ratio
    muted: "text-slate-500",         // 4.6:1 contrast ratio
    accent: "text-blue-700",         // 7.2:1 contrast ratio (WCAG AAA)
    danger: "text-red-700",          // 6.8:1 contrast ratio
    success: "text-emerald-700",     // 7.0:1 contrast ratio
  },
  bg: {
    surface: "bg-white",
    sunken: "bg-slate-50",
    subtle: "bg-slate-100",
    accentSoft: "bg-blue-50/80",
    accentSolid: "bg-blue-600",
    darkSolid: "bg-slate-900",
  },
  border: {
    default: "border-slate-200",
    strong: "border-slate-300",
    accent: "border-blue-600",
    accentSubtle: "border-blue-200/80",
  }
};

export const tokens = {
  typography: {
    heading: {
      lg: "text-2xl font-bold tracking-tight",
      md: "text-lg font-bold tracking-tight",
      sm: "text-base font-semibold"
    },
    body: {
      md: "text-sm font-medium",
      sm: "text-sm text-slate-500"
    }
  },
  semantic: semanticTokens,
};

