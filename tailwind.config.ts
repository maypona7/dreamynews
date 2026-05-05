import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbff",
          100: "#def4fc",
          200: "#bfe8f8",
          300: "#94d7f0",
          400: "#60c1e6",
          500: "#2faedb",
          600: "#1f90bc",
          700: "#1f7397",
          800: "#215f7b",
          900: "#224f66",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
