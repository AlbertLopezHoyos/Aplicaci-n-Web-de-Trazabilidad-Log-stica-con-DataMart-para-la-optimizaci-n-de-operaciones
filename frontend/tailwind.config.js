/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rojo ladrillo institucional del isotipo (gruposalazarperu.com)
        salazar: {
          50: '#fbf6f6',
          100: '#f6e9ea',
          200: '#ecd3d5',
          300: '#dbafb2',
          400: '#c48489',
          500: '#a95f64',
          600: '#94484d',
          700: '#833a3c',
          800: '#6f3133',
          900: '#572729',
          950: '#331617',
        },
        // Gris corporativo de la "G" del isotipo
        graphite: {
          50: '#f6f6f7',
          100: '#ebebec',
          200: '#d8d9da',
          300: '#bcbdbf',
          400: '#9b9d9f',
          500: '#86888a',
          600: '#6d6f71',
          700: '#58595b',
          800: '#414244',
          900: '#2e2f31',
          950: '#1c1d1e',
        },
        accent: {
          brick: '#a4433f',
          gold: '#c08a2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(46, 47, 49, 0.08)',
        nav: '0 2px 12px rgba(46, 47, 49, 0.14)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateX(-8px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
