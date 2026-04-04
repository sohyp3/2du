/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-dim': 'var(--color-surface-dim)',
        'surface-container': 'var(--color-surface-container)',
        'surface-container-low': 'var(--color-surface-container-low)',
        'surface-container-high': 'var(--color-surface-container-high)',
        'surface-container-highest': 'var(--color-surface-container-highest)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-variant': 'var(--color-on-surface-variant)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          container: 'var(--color-primary-container)',
          dim: 'var(--color-primary-dim)',
        },
        outline: {
          DEFAULT: 'var(--color-outline)',
          variant: 'var(--color-outline-variant)',
        },
        secondary: 'var(--color-secondary)',
        'on-primary': 'var(--color-on-primary)',
        error: { DEFAULT: 'var(--color-error)', container: 'var(--color-error-container)' },
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-bold': ['Inter_700Bold'],
        serif: ['PlayfairDisplay_400Regular'],
        'serif-medium': ['PlayfairDisplay_500Medium'],
        'serif-bold': ['PlayfairDisplay_700Bold'],
        elegant: ['CormorantGaramond_400Regular'],
        'elegant-medium': ['CormorantGaramond_500Medium'],
        'elegant-bold': ['CormorantGaramond_700Bold'],
      },
    },
  },
  plugins: [],
};
