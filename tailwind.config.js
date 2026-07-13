/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Drafting Room palette — paper + blueprint aesthetic
        paper: {
          50: '#FBF8EF',  // cards background
          100: '#F7F2E7', // app shell background
          200: '#F1EBDA', // header/tab bar, stat blocks
        },
        border: {
          DEFAULT: '#CFC4AA', // outer shell border
          100: '#DCD2B8',     // dividers, card borders
          200: '#E5DBC2',     // nested dividers
          300: '#C9BFA8',     // input borders
          400: '#CBBE9C',     // thin separators
        },
        ink: {
          900: '#22303D',   // primary headings/body
          700: '#3E4C57',   // secondary body
          500: '#6B7A87',   // muted/labels
          400: '#8A9199',   // tertiary labels
          600: '#4A5964',   // tertiary
        },
        accent: {
          DEFAULT: '#2C5C82', // blueprint blue — primary interactive
          light: '#DCE9F1',   // light blue background
          dark: '#1B2A3D',    // dark variant
        },
        rust: {
          DEFAULT: '#B5502B', // distinct CTA (Export PDF)
          light: '#FBF3EA',   // text on rust bg
        },
        success: {
          50: '#EFF6ED',  // background
          200: '#BFE0BA', // border
          700: '#2E5D2A', // text
        },
        // Sheet diagram tokens
        diagram: {
          canvas: '#1B2A38',     // dark navy blueprint bg
          outline: '#3D5468',    // sheet outline stroke
          fill: 'rgba(111,168,199,0.12)', // part fill
          stroke: '#6FA8C7',     // part stroke
          plate: '#0F1B26',      // label plate bg
          label: '#EAF3F8',      // primary label text
          dim: '#8FB6CC',        // dimension subtext
        },
        // Legacy alias for backward compatibility
        primary: {
          50: '#EFF6F9',
          100: '#DCE9F1',
          200: '#B9D4E4',
          300: '#8FB8CC',
          400: '#6FA0C2',
          500: '#2C5C82',
          600: '#24506E',
          700: '#1B3D56',
          800: '#1B2A38',
          900: '#0F1B26',
        },
        surface: {
          50: '#F7F2E7',
          100: '#F1EBDA',
          200: '#E5DBC2',
          300: '#DCD2B8',
          400: '#CFC4AA',
          500: '#8A9199',
          600: '#6B7A87',
          700: '#4A5964',
          800: '#3E4C57',
          900: '#22303D',
        },
        danger: {
          50: '#FDF2F2',
          100: '#FDE8E8',
          200: '#FBD5D5',
          300: '#F5ABAB',
          400: '#EF8080',
          500: '#E55A5A',
          600: '#D43D3D',
          700: '#B42C2C',
          800: '#921F1F',
          900: '#7A1919',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Work Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'headline-lg': ['22px', { lineHeight: '1.2' }],
        'headline-md': ['19px', { lineHeight: '1.3' }],
        'headline-sm': ['16px', { lineHeight: '1.4' }],
        'title-md': ['14.5px', { lineHeight: '1.4' }],
        'title-sm': ['13px', { lineHeight: '1.4' }],
        'body-md': ['13px', { lineHeight: '1.5' }],
        'body-sm': ['12px', { lineHeight: '1.5' }],
        'label-md': ['11px', { lineHeight: '1.3' }],
        'label-sm': ['10.5px', { lineHeight: '1.3' }],
        'data-lg': ['22px', { lineHeight: '1.2' }],
        'data-md': ['14px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        DEFAULT: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        md: '2px',
        sm: '2px',
        // Override — almost everything is sharp 2px
      },
      boxShadow: {
        'elev-0': 'none',
        'elev-1': '0 1px 3px rgba(30,25,15,0.1)',
        'elev-2': '0 1px 4px rgba(30,25,15,0.12)',
        'elev-3': '0 2px 8px rgba(30,25,15,0.15)',
        'none': 'none',
      },
    },
  },
  plugins: [],
};