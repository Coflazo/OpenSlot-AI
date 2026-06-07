// Sanzo Wada combination #286 + companions
// Burnt Sienna, Orange Yellow, Peacock Blue, Violet Blue
export const palette = {
  peacock: "#00939B",
  violet: "#40456A",
  sienna: "#AE5224",
  saffron: "#FCB315",
  vert: "#489B6E",
  ink: "#111314",
  porcelain: "#FAF8F1",
  stone: "#E7E1D6"
} as const;

export const statusColor: Record<
  | "booked"
  | "open"
  | "calling"
  | "held"
  | "filled"
  | "expired"
  | "paused"
  | "needs_review"
  | "consent_missing"
  | "safety_incomplete",
  { bg: string; fg: string; ring: string; label: string }
> = {
  booked: { bg: "#ECEDF2", fg: "#40456A", ring: "#A8ABC1", label: "Booked" },
  open: { bg: "#E6F4F5", fg: "#00767D", ring: "#5BBCC2", label: "Open" },
  calling: { bg: "#E6F4F5", fg: "#00767D", ring: "#00939B", label: "Calling" },
  held: { bg: "#FFF6E0", fg: "#956805", ring: "#FCB315", label: "Held" },
  filled: { bg: "#E9F4EE", fg: "#214A33", ring: "#489B6E", label: "Filled" },
  expired: { bg: "#FAEEE6", fg: "#673015", ring: "#AE5224", label: "Expired" },
  paused: { bg: "#ECEDF2", fg: "#40456A", ring: "#7C80A2", label: "Paused" },
  needs_review: { bg: "#FFF6E0", fg: "#956805", ring: "#FCB315", label: "Needs review" },
  consent_missing: { bg: "#FAEEE6", fg: "#673015", ring: "#AE5224", label: "Consent missing" },
  safety_incomplete: { bg: "#FAEEE6", fg: "#673015", ring: "#AE5224", label: "Safety incomplete" }
};
