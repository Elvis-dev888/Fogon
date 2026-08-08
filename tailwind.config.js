/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#14110E',
        paper2: '#1D1712',
        paper3: '#241C15',
        cream: '#F4EDDF',
        creamsoft: '#B7AA95',
        gold: '#C79A3C',
        golddark: '#9C7726',
        champagne: '#E2CC98',
        sage: '#7C8A6D',
        wine: '#8E5C55',
        line: 'rgba(244,237,223,0.13)',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
