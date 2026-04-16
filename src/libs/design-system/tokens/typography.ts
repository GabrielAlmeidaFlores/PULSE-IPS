export const typographyTokens = {
  sizeXs: "0.625rem",
  sizeSm: "0.75rem",
  sizeBase: "0.875rem",
  sizeLg: "1rem",
  sizeXl: "1.125rem",
  size2xl: "1.25rem",
  size3xl: "1.5rem",

  weightNormal: "400",
  weightMedium: "500",
  weightSemibold: "600",
  weightBold: "700",
  weightExtrabold: "800",

  trackingTight: "-0.025em",
  trackingNormal: "0em",
  trackingWide: "0.025em",
  trackingWider: "0.05em",
  trackingWidest: "0.1em",

  labelUppercase: {
    fontSize: "0.625rem",
    fontWeight: "700",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  },
} as const
