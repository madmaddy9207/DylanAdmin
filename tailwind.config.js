/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        acid: "#CCFF00",
      },
      boxShadow: {
        lift: "4px 4px 0 0 #000000",
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      transitionDuration: {
        100: "100ms",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
