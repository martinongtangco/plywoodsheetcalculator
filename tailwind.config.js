/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Primary — warm amber evoking wood grain and craftsmanship */
        primary: {
          50:  '#FFF8F0',
          100: '#FEEDC8',
          200: '#FDD9A0',
          300: '#FBC068',
          400: '#F9A230',
          500: '#F5890A',
          600: '#D96C00',
          700: '#B85000',
          800: '#97400A',
          900: '#7A3612',
          950: '#451A02',
        },
        /* Surface — warm whites instead of cool grays */
        surface: {
          50:  '#FAF9F7',
          100: '#F5F3EF',
          200: '#EDEAE4',
          300: '#E0DBD2',
          400: '#C8BFB3',
          500:  '#ADA292',
          600:  '#928575',
          700:  '#75685B',
          800:  '#5F554A',
          900:  '#4E463C',
          950:  '#2D2823',
        },
        /* Accent — deep walnut for secondary actions and emphasis */
        accent: {
          50:  '#FDF8F6',
          100:  '#FAEDE6',
          200:  '#F4D7CB',
          300:  '#EBBFAD',
          400:  '#DF9A78',
          500:  '#D47A52',
          600:  '#C4613A',
          700:  '#A64A2C',
          800:  '#873D26',
          900:  '#6E3420',
          950:  '#3C190C',
        },
        /* Success — warm green like fresh wood */
        success: {
          50:  '#F0FDF5',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        /* Danger — burnt orange instead of harsh red */
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        /* Info — deep amber */
        info: {
          50:  '#FFFEB8',
          100: '#FEF08A',
          200: '#FDE047',
          300: '#FACC15',
          400: '#EAB308',
          500: '#CA8A04',
          600: '#A16207',
          700: '#854D0E',
          800: '#713F12',
          900: '#603214',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      /* Type scale — Material 3 naming, tuned for a single-product tool.
         Each entry is [size, { lineHeight, fontWeight, letterSpacing }]. */
      fontSize: {
        'display-lg': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-lg': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        'headline-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        'title-lg': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'title-md': ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'label-md': ['0.8125rem', { lineHeight: '1rem', fontWeight: '600' }],
        'label-sm': ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '600', letterSpacing: '0.02em' }],
      },
      boxShadow: {
        'elev-0': '0 0 0 1px rgba(45,40,35,0.06)',
        'elev-1': '0 1px 3px rgba(45,40,35,0.08), 0 1px 2px rgba(45,40,35,0.06)',
        'elev-2': '0 2px 6px rgba(45,40,35,0.08), 0 2px 4px rgba(45,40,35,0.06)',
        'elev-3': '0 4px 12px rgba(45,40,35,0.1), 0 2px 6px rgba(45,40,35,0.06)',
        'elev-4': '0 8px 24px rgba(45,40,35,0.12), 0 4px 12px rgba(45,40,35,0.08)',
      },
      borderRadius: {
        'lg': '0.75rem',
        'xl': '1rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}