import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          accent: "var(--color-primary-accent)",
          foreground: "#FFFFFF",
        },
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        ink: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
        },
        border: "var(--color-border)",
        warm: "var(--color-accent-warm)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Manrope", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      screens: {
        mdlg: "930px",
      },
    },
  },
  plugins: [],
};

export default config;
