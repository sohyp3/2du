/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: 'var(--c-surface)',
        'surface-dim': 'var(--c-surface-dim)',
        'surface-container': 'var(--c-surface-container)',
        'surface-container-low': 'var(--c-surface-container-low)',
        'surface-container-high': 'var(--c-surface-container-high)',
        'surface-container-highest': 'var(--c-surface-container-highest)',
        'on-surface': 'var(--c-on-surface)',
        'on-surface-variant': 'var(--c-on-surface-variant)',
        primary: {
          DEFAULT: 'var(--c-primary)',
          container: 'var(--c-primary-container)',
          dim: 'var(--c-primary-dim)',
        },
        outline: {
          DEFAULT: 'var(--c-outline)',
          variant: 'var(--c-outline-variant)',
        },
        secondary: 'var(--c-secondary)',
        'on-primary': 'var(--c-on-primary)',
        error: { DEFAULT: 'var(--c-error)', container: 'var(--c-error-container)' },
        'on-error-container': 'var(--c-on-error-container)',
        'accent-soft': 'var(--c-accent-soft)',
        success: 'var(--c-success)',
        warning: 'var(--c-warning)',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-bold': ['Inter_700Bold'],
        display: ['BricolageGrotesque_800ExtraBold'],
        'display-semi': ['BricolageGrotesque_600SemiBold'],
      },
    },
  },
  plugins: [],
};
