// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── UAPB Brand Colours ─────────────────────────────────
      colors: {
        gold: {
          DEFAULT: "#efa522",
          dark:    "#d4901e",
        },
      },

      // ── Semantic Font Families ─────────────────────────────
      // Usage in JSX:
      //   font-display  → Bebas Neue  (big titles, school name)
      //   font-heading  → Archivo     (sub-headings, nav, badges)
      //   font-body     → Open Sans   (paragraphs, descriptions)
      //
      // The CSS variables are injected by next/font/google in layout.tsx
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        heading:  ["var(--font-archivo)", "sans-serif"],
        body:     ["var(--font-opensans)", "sans-serif"],
      },
    },
  },
  plugins: [
    // scrollbar-hide: hides scrollbars while keeping scroll functionality
    // Used in SearchAndFilter for horizontal pill rows on mobile.
    function ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".scrollbar-hide::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
  ],
};

export default config;
