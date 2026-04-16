export const colorTokens = {
  primary: "hsl(var(--primary))",
  primaryForeground: "hsl(var(--primary-foreground))",
  secondary: "hsl(var(--secondary))",
  secondaryForeground: "hsl(var(--secondary-foreground))",
  destructive: "hsl(var(--destructive))",
  destructiveForeground: "hsl(var(--destructive-foreground))",
  muted: "hsl(var(--muted))",
  mutedForeground: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--accent))",
  accentForeground: "hsl(var(--accent-foreground))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: "hsl(var(--card))",
  cardForeground: "hsl(var(--card-foreground))",
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  sidebar: "hsl(var(--sidebar))",
  sidebarForeground: "hsl(var(--sidebar-foreground))",
  sidebarBorder: "hsl(var(--sidebar-border))",

  statusActive: "hsl(var(--color-active))",
  statusWarning: "hsl(var(--color-warning))",
  statusDanger: "hsl(var(--color-danger))",
  statusNeutral: "hsl(var(--color-neutral))",
} as const

export type ColorToken = keyof typeof colorTokens
