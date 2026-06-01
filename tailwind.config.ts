import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["var(--font-geist-sans)", "Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ide: {
          bg: "#1e1e1e",
          panel: "#252526",
          border: "#333333",
          active: "#37373d",
          text: "#d4d4d4",
          muted: "#858585",
          blue: "#569cd6",
          green: "#6a9955",
          yellow: "#dcdcaa",
          orange: "#ce9178",
          purple: "#c586c0"
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
