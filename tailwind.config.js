/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // --- Solar Feasibility Studio tokens (SPEC-UPGRADE.md §6) ---
        ink: "#16231F", // primary text
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
          // teal accent — debt segment in the investment summary
          500: "#1E7A78",
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
