/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#fdbe33',
        navy: '#4a4c70',
        ink: '#20212b',
        mist: '#f3f6ff',
      },
      fontFamily: {
        sans: ['Quicksand', 'system-ui', 'sans-serif'],
      },
      maxWidth: { page: '1140px', wide: '1366px' },
    },
  },
  plugins: [],
};
