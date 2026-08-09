import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f6f5",
          100: "#e3e8e6",
          200: "#c3d0cb",
          300: "#98aca4",
          400: "#6c8880",
          500: "#4c6b63",
          600: "#38534c",
          700: "#2c423c",
          800: "#1f3430",
          900: "#122320",
          950: "#0a1513",
        },
        clay: {
          50: "#fdf6ef",
          100: "#faead9",
          200: "#f3d1ae",
          300: "#eab27b",
          400: "#e0904e",
          500: "#d5762f",
          600: "#b85d24",
          700: "#954720",
          800: "#793a20",
          900: "#63311d",
        },
        sand: {
          50: "#fbfaf7",
          100: "#f4f1ea",
          200: "#e8e1d2",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,35,32,0.06), 0 8px 24px -8px rgba(18,35,32,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(0.75rem) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "drawer-in": "drawer-in 0.28s cubic-bezier(.4,0,.2,1)",
        "overlay-in": "overlay-in 0.2s ease-out",
        "toast-in": "toast-in 0.25s cubic-bezier(.4,0,.2,1)",
        "modal-in": "modal-in 0.18s cubic-bezier(.4,0,.2,1)",
      },
    },
  },
  plugins: [],
};

export default config;
