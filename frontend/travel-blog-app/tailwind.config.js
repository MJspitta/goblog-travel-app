/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      display: ["Poppins", "sans-serif"],
    },
    extend: {
      // Colors that were used in project
      colors: {
        primary: "#05B6D3",
        secondary: "#EF863E",
      },
      backgroundImage: {
        'login-bg-img': "url('./src/assets/images/login-bg-image.jpg')",
        'signup-bg-img': "url('./src/assets/images/signup-bg-img.jpg')",
      },
    },
  },
  plugins: [],
}

