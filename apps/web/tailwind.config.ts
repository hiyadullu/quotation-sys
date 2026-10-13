import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7fc', 100: '#d7ecf8', 200: '#b0d9f1', 300: '#7bbfe6', 400: '#3fa0d6',
          500: '#1783bf', 600: '#0c6aa6', 700: '#0a5586', 800: '#0b466c', 900: '#0a2540',
        },
        aqua: { 400: '#2cc4d6', 500: '#14a9c0', 600: '#0e8aa0' },
        ink: { DEFAULT: '#14202e', soft: '#3a4a5a', muted: '#5d6b7a', faint: '#8a97a5' },
        surface: { DEFAULT: '#ffffff', alt: '#f4f8fb', line: '#d8e2ea' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,37,64,.05), 0 4px 16px -6px rgba(10,37,64,.10)',
        lift: '0 8px 30px -8px rgba(10,37,64,.25)',
      },
      borderRadius: { xl2: '1.125rem' },
    },
  },
  plugins: [],
} satisfies Config;
