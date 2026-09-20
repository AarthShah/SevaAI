/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
        },
        civic: {
          blue: '#1e3a8a',
          navy: '#0f172a',
          amber: '#d97706',
          danger: '#dc2626'
        }
      }
    },
  },
  plugins: [],
}
