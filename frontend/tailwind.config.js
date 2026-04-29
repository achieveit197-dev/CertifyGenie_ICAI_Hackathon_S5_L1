/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f7',
          100: '#d4e0ee',
          200: '#a8c0dd',
          300: '#7da1cc',
          400: '#5181bb',
          500: '#2561a9',
          600: '#1e4d8a',
          700: '#1e3a5f',
          800: '#162c49',
          900: '#0e1e32',
          950: '#080f1e',
        },
        brand: {
          primary: '#1E3A5F',
          accent: '#2ECC71',
          light: '#F8FAFC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      boxShadow: {
        'glow': '0 0 40px rgba(30, 58, 95, 0.15)',
        'glow-accent': '0 0 30px rgba(46, 204, 113, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)',
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.12)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-hero': 'radial-gradient(at 40% 20%, #1e4d8a 0px, transparent 50%), radial-gradient(at 80% 0%, #0e1e32 0px, transparent 50%), radial-gradient(at 0% 50%, #162c49 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
