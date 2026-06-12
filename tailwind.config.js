/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712", // deeper black
        surface: "#0f172a", // rich dark slate
        border: "#1e293b", // slate border
        text: {
          primary: "#f8fafc",
          secondary: "#94a3b8",
        },
        yes: {
          DEFAULT: "#2468e4", // Polymarket Blue for Yes
          hover: "#1d58c4",
          light: "rgba(36, 104, 228, 0.1)",
        },
        no: {
          DEFAULT: "#e22d3d", // Polymarket Red for No
          hover: "#c82331",
          light: "rgba(226, 45, 61, 0.1)",
        },
        purple: {
          DEFAULT: "#2468e4", // Alias brand color to Polymarket Blue
          hover: "#1d58c4",
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
