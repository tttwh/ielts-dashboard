import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#6B7280",
        line: "#E5E7EB",
        ieltsBlue: "#2855D9",
        ieltsPurple: "#6D28D9",
        surface: "#F8FAFC"
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "8px"
      }
    }
  },
  plugins: []
} satisfies Config;
