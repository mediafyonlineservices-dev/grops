// Deep-Lab neon palette: high-contrast, lab-grade neon accents.
// Each color has a recognizable name for the LLM to reason about.
export const NEON_PALETTE: Array<{ name: string; hex: string }> = [
  { name: "Electric Violet", hex: "#A855F7" },
  { name: "Cyber Cyan", hex: "#22D3EE" },
  { name: "Acid Lime", hex: "#A3E635" },
  { name: "Neon Magenta", hex: "#EC4899" },
  { name: "Solar Gold", hex: "#FACC15" },
  { name: "Plasma Orange", hex: "#FB923C" },
  { name: "Cobalt Pulse", hex: "#60A5FA" },
  { name: "Mint Sigma", hex: "#34D399" },
];

// A small fallback color when something goes wrong.
export const FALLBACK_COLOR = "#94A3B8";
