import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
          2: "rgb(var(--accent-2) / <alpha-value>)",
          3: "rgb(var(--accent-3) / <alpha-value>)",
        },
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "11px",
        "2xl": "15px",
        "3xl": "22px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(var(--shadow-color) / 0.04)",
        soft: "0 1px 2px rgb(var(--shadow-color) / 0.05), 0 1px 1px rgb(var(--shadow-color) / 0.04)",
        card: "0 1px 2px rgb(var(--shadow-color) / 0.04), 0 6px 16px -8px rgb(var(--shadow-color) / 0.10)",
        lift: "0 2px 4px rgb(var(--shadow-color) / 0.05), 0 16px 40px -12px rgb(var(--shadow-color) / 0.20)",
        glow: "0 1px 2px rgb(var(--shadow-color) / 0.10)",
        "glow-accent":
          "0 1px 2px rgb(var(--shadow-color) / 0.10), 0 10px 34px -12px rgb(var(--accent) / 0.55)",
        "glow-lg":
          "0 4px 10px rgb(var(--shadow-color) / 0.08), 0 24px 60px -16px rgb(var(--accent) / 0.5)",
      },
      backgroundImage: {
        "accent-gradient":
          "linear-gradient(120deg, rgb(var(--accent)), rgb(var(--accent-2)), rgb(var(--accent-3)))",
        "accent-sheen":
          "linear-gradient(120deg, rgb(var(--accent)), rgb(var(--accent-2)))",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shine: {
          "0%": { transform: "translateX(-120%)" },
          "60%, 100%": { transform: "translateX(220%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "star-bottom": {
          "0%": { transform: "translate(0, 0)", opacity: "1" },
          "100%": { transform: "translate(-100%, 0)", opacity: "0" },
        },
        "star-top": {
          "0%": { transform: "translate(0, 0)", opacity: "1" },
          "100%": { transform: "translate(100%, 0)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
        "float-slow": "float 9s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        shine: "shine 5s ease-in-out infinite",
        "spin-slow": "spin-slow 14s linear infinite",
        "star-bottom": "star-bottom linear infinite alternate",
        "star-top": "star-top linear infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
