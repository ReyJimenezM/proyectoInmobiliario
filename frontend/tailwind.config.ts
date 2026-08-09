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
    },
  },
  plugins: [],
};

export default config;
