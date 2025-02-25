/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gradientStart: "#000000",
        gradientEnd: "#130F40",
      },

      fontFamily: {
        merienda: ["Merienda"],
      },

      // backgroundImage: {
      //   'sparkle': "url('../../../assets/images/sparkle.png')", // Add the path for your sparkle image
      // },
    },
  },
  plugins: [],
};
