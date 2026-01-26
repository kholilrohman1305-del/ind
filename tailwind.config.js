module.exports = {
  content: ["./public/**/*.html", "./public/**/*.js", "./src/**/*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
      },
      boxShadow: {
        glow: "0 30px 70px rgba(31, 11, 82, 0.45)",
      },
    },
  },
  plugins: [],
};
