/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4f9',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#8daed2',
          400: '#6793c3',
          500: '#4178b4',
          600: '#2d5d9a',
          700: '#1E3A5F',
          800: '#162d4a',
          900: '#0e2035',
          950: '#071220',
        },
        accent: {
          DEFAULT: '#2ECC71',
          hover:   '#27AE60',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'shimmer':    'shimmer 1.5s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                    to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' },  '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        card:       '0 4px 24px rgba(30,58,95,0.10)',
        'card-hover': '0 8px 32px rgba(30,58,95,0.18)',
        glow:       '0 0 20px rgba(30,58,95,0.25)',
        'glow-accent': '0 0 20px rgba(46,204,113,0.35)',
      },
    },
  },
  plugins: [],
}
