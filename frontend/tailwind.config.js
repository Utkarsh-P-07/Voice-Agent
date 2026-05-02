/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent:   '#f97316',
        accent2:  '#fb923c',
        accentSoft: '#fff7ed',
        sidebar:  '#1c1c1e',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'neu':      '6px 6px 16px #d1d5db, -6px -6px 16px #ffffff',
        'neu-sm':   '3px 3px 8px #d1d5db, -3px -3px 8px #ffffff',
        'neu-in':   'inset 4px 4px 10px #d1d5db, inset -4px -4px 10px #ffffff',
        'glow':     '0 0 20px rgba(249,115,22,0.25)',
        'glass':    '0 8px 32px rgba(0,0,0,0.08)',
      },
      backdropBlur: { xs: '4px' },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
