export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        autumn: {
          brown: "#5C3A21",
          gold: "#DDA15E",
          orange: "#E76F51",
          olive: "#606C38",
          cream: "#FAF3E0",
        },
      },
      backgroundImage: {
        "autumn-gradient": "linear-gradient(135deg, #5C3A21 0%, #E76F51 100%)",
      },
    },
  },
  plugins: [],
};
