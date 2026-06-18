/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        surface: '#1e293b',
        accent: '#22c55e',
        danger: '#ef4444',
        warn: '#f59e0b'
      }
    }
  },
  plugins: []
}
