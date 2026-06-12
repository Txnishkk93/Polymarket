/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08080a",
        surface: "#111317",
        border: "#20242c",
        text: {
          primary: "#ffffff",
          secondary: "#90949d",
        },
        yes: {
          DEFAULT: "#e15241", // orange/red for Yes
          hover: "#c84131",
          light: "rgba(225, 82, 65, 0.1)",
        },
        no: {
          DEFAULT: "#2d68e6", // blue for No
          hover: "#2153c3",
          light: "rgba(45, 104, 230, 0.1)",
        },
        purple: {
          DEFAULT: "#7c3aed",
          hover: "#6d28d9",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
