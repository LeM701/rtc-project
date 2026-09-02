/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: '#15161B',
        panel: '#1B1D24',
        panelAlt: '#22242D',
        border: '#2C2F3A',
        accent: '#7C8CF8',
        accentSoft: '#404770',
        text: '#E7E8ED',
        textDim: '#9497A6',
        danger: '#E5686B',
        online: '#4ADE80',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
