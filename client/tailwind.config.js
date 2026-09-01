/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-vazir)", "Tahoma", "sans-serif"],
      },
    },
  },
  plugins: [],
};
