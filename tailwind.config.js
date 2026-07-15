/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16231F",
        paper: "#F6F4EE",
        // --- Solar Feasibility Studio tokens (SPEC-UPGRADE.md §6) ---
        surface: "#F7F8FA", // page background
        line: "#E9ECF0", // card borders / dividers
        brand: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          500: "#F97316", // energy orange — primary
          600: "#EA580C",
          700: "#C2410C",
        },
        ok: "#16A34A", // positive results
        danger: "#DC2626", // negative / destructive
        sky: {
          50: "#EAF3F2",
          100: "#CCE3E1",
          300: "#7FB4B1",
          500: "#1E7A78",
          600: "#0F5C5B",
          700: "#0B4547",
          800: "#083536",
          900: "#062326",
        },
        sun: {
          50: "#FDF3E3",
          100: "#FBE4BC",
          300: "#F5C070",
          500: "#EDA23A",
          600: "#DB8A1E",
          700: "#B56E14",
        },
        leaf: {
          500: "#4C9A6A",
          600: "#3B7E54",
        },
        clay: {
          500: "#C6533F",
          600: "#A94531",
        },
      },
      fontFamily: {
        display: ["Kanit", "system-ui", "sans-serif"],
        sans: ["Sarabun", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
