/** @type {import('tailwindcss').Config} */
// React Native has no CSS variables, so the colours are literals. They come
// from the shared palette, the same file the web app's tokens
// (src/app/globals.css) are tested against, so the two apps cannot drift.
const { light: c } = require('../packages/shared/src/palette.json');

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: c.background,
        foreground: c.foreground,
        card: c.card,
        primary: { DEFAULT: c.primary, foreground: c.primaryForeground },
        secondary: { DEFAULT: c.muted, foreground: c.primary },
        muted: { DEFAULT: c.muted, foreground: c.mutedForeground },
        border: c.border,
        input: c.border,
        destructive: { DEFAULT: c.destructive, foreground: c.destructiveForeground, text: c.destructiveText },
        success: { DEFAULT: c.success, foreground: c.successForeground, text: c.successText },
        warning: { DEFAULT: c.warning, foreground: c.warningForeground, text: c.warningText },
        info: { DEFAULT: c.info, foreground: c.infoForeground },
        brand: { DEFAULT: c.brand, foreground: c.brandForeground },
      },
      borderRadius: { lg: 10, md: 8, sm: 6 },
      // One face per class: native fonts are separate files per weight, so
      // `font-bold` alone would not pick the bold cut of a custom family.
      fontFamily: {
        sans: ['IBMPlexSans_400Regular'],
        'sans-medium': ['IBMPlexSans_500Medium'],
        'sans-semibold': ['IBMPlexSans_600SemiBold'],
        'sans-bold': ['IBMPlexSans_700Bold'],
        mono: ['IBMPlexMono_400Regular'],
        'mono-medium': ['IBMPlexMono_500Medium'],
        'mono-semibold': ['IBMPlexMono_600SemiBold'],
        'mono-bold': ['IBMPlexMono_700Bold'],
      },
    },
  },
  plugins: [],
};
