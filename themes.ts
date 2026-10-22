// Ready-made colour themes. Pick one in site.config.ts (theme: themes.block),
// or spread one and change single colours: { ...themes.mint, primary: "#0f7b5a" }.
// Every button colour is tuned so its text passes WCAG AA contrast (4.5:1).
// Several palettes are adapted from the neobrutalism palettes collected at
// https://colorany.com/color-palettes/neobrutalism-color-palettes/.

export type Theme = {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  // Five tints for project cards without a cover image.
  accents: string[];
};

export const themes = {
  // Block, after "Bold Block Color Challenge"
  block: {
    background: "#f4f4f1",
    foreground: "#1a1a1a",
    card: "#ffffff",
    muted: "#e6e6e1",
    mutedForeground: "#55554f",
    primary: "#3d5afe",
    primaryForeground: "#ffffff",
    secondary: "#ffd600",
    secondaryForeground: "#1a1a1a",
    accent: "#ff3d00",
    accentForeground: "#1a1a1a",
    accents: ["#3d5afe", "#ffd600", "#ff3d00", "#bdbdbd", "#00e5ff"],
  },
  // Cobalt
  cobalt: {
    background: "#fbf8ef",
    foreground: "#16161d",
    card: "#ffffff",
    muted: "#efebdf",
    mutedForeground: "#5e5b66",
    primary: "#3451d1",
    primaryForeground: "#ffffff",
    secondary: "#ffd84d",
    secondaryForeground: "#16161d",
    accent: "#1f9e6e",
    accentForeground: "#16161d",
    accents: ["#3451d1", "#ffd84d", "#1f9e6e", "#b9a6ff", "#7cc8f2"],
  },
  // Coral
  coral: {
    background: "#fff5ee",
    foreground: "#1d1414",
    card: "#ffffff",
    muted: "#f6e6da",
    mutedForeground: "#6b5a55",
    primary: "#d2462c",
    primaryForeground: "#ffffff",
    secondary: "#ffc94a",
    secondaryForeground: "#1d1414",
    accent: "#22737a",
    accentForeground: "#ffffff",
    accents: ["#d2462c", "#ffc94a", "#22737a", "#f4a3b4", "#8fd3c8"],
  },
  // Burst, after "Vivid Color Burst"
  burst: {
    background: "#fff7ef",
    foreground: "#2c3a47",
    card: "#ffffff",
    muted: "#f6e8dc",
    mutedForeground: "#5b6670",
    primary: "#ff796b",
    primaryForeground: "#2c3a47",
    secondary: "#ffc84c",
    secondaryForeground: "#2c3a47",
    accent: "#4ecdc4",
    accentForeground: "#2c3a47",
    accents: ["#ff796b", "#ffc84c", "#4ecdc4", "#f7cac9", "#92a8d1"],
  },
  // Twist, after "Bold Color Twists"
  twist: {
    background: "#fbf3f4",
    foreground: "#2b2d42",
    card: "#ffffff",
    muted: "#f1e3e6",
    mutedForeground: "#5d6175",
    primary: "#e9102c",
    primaryForeground: "#ffffff",
    secondary: "#f7c9d1",
    secondaryForeground: "#2b2d42",
    accent: "#2b2d42",
    accentForeground: "#ffffff",
    accents: ["#e9102c", "#f7c9d1", "#2b2d42", "#8d99ae", "#ffc84c"],
  },
  // Mint, after "Warm Mint Twist"
  mint: {
    background: "#f6fbf7",
    foreground: "#2a2a2a",
    card: "#ffffff",
    muted: "#e4efe7",
    mutedForeground: "#56605a",
    primary: "#3eb489",
    primaryForeground: "#2a2a2a",
    secondary: "#fad02e",
    secondaryForeground: "#2a2a2a",
    accent: "#2a2a2a",
    accentForeground: "#ffffff",
    accents: ["#3eb489", "#fad02e", "#2a2a2a", "#a8dadc", "#f7cac9"],
  },
  // Playful, after "Playful Color Vibes"
  playful: {
    background: "#f8f6ff",
    foreground: "#212121",
    card: "#ffffff",
    muted: "#ebe7f7",
    mutedForeground: "#5d5a6b",
    primary: "#7c4dff",
    primaryForeground: "#ffffff",
    secondary: "#ff6f00",
    secondaryForeground: "#212121",
    accent: "#00bfae",
    accentForeground: "#212121",
    accents: ["#7c4dff", "#ff6f00", "#00bfae", "#ffd600", "#f7cac9"],
  },
  // Nature, after "Nature Meets Bright Accents"
  nature: {
    background: "#f5f8f2",
    foreground: "#0c3e25",
    card: "#ffffff",
    muted: "#e4ecdf",
    mutedForeground: "#4b5f52",
    primary: "#0c3e25",
    primaryForeground: "#ffffff",
    secondary: "#ffd700",
    secondaryForeground: "#0c3e25",
    accent: "#0073eb",
    accentForeground: "#ffffff",
    accents: ["#0c3e25", "#ffd700", "#0073eb", "#88b04b", "#a8dadc"],
  },
  // Earthy, after "Textural Contrast in Soft Hues"
  earthy: {
    background: "#fbf6ec",
    foreground: "#264653",
    card: "#ffffff",
    muted: "#efe6d6",
    mutedForeground: "#5a6a70",
    primary: "#238173",
    primaryForeground: "#ffffff",
    secondary: "#e9c46a",
    secondaryForeground: "#264653",
    accent: "#f4a261",
    accentForeground: "#264653",
    accents: ["#238173", "#e9c46a", "#f4a261", "#7d4b8d", "#a8dadc"],
  },
  // Peach (pastel)
  peach: {
    background: "#fff8f3",
    foreground: "#3b2f2f",
    card: "#ffffff",
    muted: "#f7e9e0",
    mutedForeground: "#6e5f5c",
    primary: "#f9a8a0",
    primaryForeground: "#3b2f2f",
    secondary: "#ffe5a3",
    secondaryForeground: "#3b2f2f",
    accent: "#b8e0d2",
    accentForeground: "#3b2f2f",
    accents: ["#f9a8a0", "#ffe5a3", "#b8e0d2", "#cdb4db", "#a2d2ff"],
  },
  // Lavender (pastel)
  lavender: {
    background: "#f8f5ff",
    foreground: "#2e2a3f",
    card: "#ffffff",
    muted: "#ebe5f7",
    mutedForeground: "#625d73",
    primary: "#c3b1f5",
    primaryForeground: "#2e2a3f",
    secondary: "#ffd6e8",
    secondaryForeground: "#2e2a3f",
    accent: "#b5ead7",
    accentForeground: "#2e2a3f",
    accents: ["#c3b1f5", "#ffd6e8", "#b5ead7", "#fff1a8", "#a8d8f0"],
  },
  // Sky (pastel)
  sky: {
    background: "#f4f9ff",
    foreground: "#1f2a3a",
    card: "#ffffff",
    muted: "#e2ecf7",
    mutedForeground: "#56627a",
    primary: "#9cc9f5",
    primaryForeground: "#1f2a3a",
    secondary: "#ffd8a8",
    secondaryForeground: "#1f2a3a",
    accent: "#f7b2c4",
    accentForeground: "#1f2a3a",
    accents: ["#9cc9f5", "#ffd8a8", "#f7b2c4", "#c7f0bd", "#e2c6ff"],
  },
  // Stone (neutral): warm greys with a terracotta accent
  stone: {
    background: "#f5f3ef",
    foreground: "#1f1d1a",
    card: "#ffffff",
    muted: "#e8e4dc",
    mutedForeground: "#5c5750",
    primary: "#44403c",
    primaryForeground: "#ffffff",
    secondary: "#e7e0d2",
    secondaryForeground: "#1f1d1a",
    accent: "#b4532a",
    accentForeground: "#ffffff",
    accents: ["#44403c", "#e7e0d2", "#b4532a", "#a8a29e", "#d6cfc4"],
  },
  // Sand (neutral): beige and sage
  sand: {
    background: "#faf6ee",
    foreground: "#2b2620",
    card: "#ffffff",
    muted: "#eee6d6",
    mutedForeground: "#655c50",
    primary: "#7a6a52",
    primaryForeground: "#ffffff",
    secondary: "#eadfc8",
    secondaryForeground: "#2b2620",
    accent: "#5f7161",
    accentForeground: "#ffffff",
    accents: ["#7a6a52", "#eadfc8", "#5f7161", "#c8b99c", "#b7c4b1"],
  },
  // Slate (neutral): cool blue greys
  slate: {
    background: "#f3f5f7",
    foreground: "#1e2329",
    card: "#ffffff",
    muted: "#e2e7ec",
    mutedForeground: "#56606b",
    primary: "#3c4a5a",
    primaryForeground: "#ffffff",
    secondary: "#dde3ea",
    secondaryForeground: "#1e2329",
    accent: "#677689",
    accentForeground: "#ffffff",
    accents: ["#3c4a5a", "#dde3ea", "#677689", "#a9b4c0", "#c9d2db"],
  },
  // Graphite (neutral): black, white and grey
  graphite: {
    background: "#f2f2f0",
    foreground: "#121212",
    card: "#ffffff",
    muted: "#e3e3e0",
    mutedForeground: "#595959",
    primary: "#2b2b2b",
    primaryForeground: "#ffffff",
    secondary: "#dcdcd8",
    secondaryForeground: "#121212",
    accent: "#6e6e6e",
    accentForeground: "#ffffff",
    accents: ["#2b2b2b", "#dcdcd8", "#6e6e6e", "#a3a3a0", "#c4c4c0"],
  },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;
