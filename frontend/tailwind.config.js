/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          blue: '#1e3a8a',       // Deep civic blue (primary)
          medium: '#2563eb',     // Medium blue (secondary)
          navy: '#0f172a',       // Dark navy / charcoal (headings & dark text)
          charcoal: '#1e293b',   // Body text
          light: '#f8fafc',      // Very light neutral gray background
          surface: '#ffffff',    // White card background
          border: '#e2e8f0',     // Light gray border
          success: '#166534',    // Muted green
          warning: '#92400e',    // Muted amber
          danger: '#991b1b',     // Muted red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
