/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          green: '#0F5132',
          darkgreen: '#0A4027',
          gold: '#FFD700',
          red: '#DC3545',
          blue: '#0D6EFD',
        }
      },
      backgroundImage: {
        'poker-table': "radial-gradient(ellipse at center, #0F5132 0%, #0A4027 100%)",
      }
    },
  },
  plugins: [],
} 