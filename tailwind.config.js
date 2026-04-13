/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#f59e0b',
        'game-bg': '#0a0c14',
        'game-panel': '#111827',
        'game-border': '#1e2d47',
      },
    },
  },
  plugins: [],
}
