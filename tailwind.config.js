/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FBF8EE',
          100: '#F5EECD',
          200: '#EAD99B',
          300: '#DEC268',
          400: '#D4AF37',
          500: '#C9A227',
          600: '#B08B1B',
          700: '#8C6D14',
          800: '#6B520E',
          900: '#4A3808',
          950: '#2E2203',
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out forwards',
        'slide-down': 'slideDown 200ms ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
