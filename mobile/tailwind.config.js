/** @type {import('tailwindcss').Config} */
// The web app's tokens (src/app/globals.css + tailwind.config.js) resolved to
// literal colors — React Native has no CSS variables. Keep the two in step.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#0a0a0a',
        card: '#ffffff',
        primary: { DEFAULT: '#171717', foreground: '#fafafa' },
        secondary: { DEFAULT: '#f5f5f5', foreground: '#171717' },
        muted: { DEFAULT: '#f5f5f5', foreground: '#737373' },
        border: '#e5e5e5',
        input: '#e5e5e5',
        destructive: { DEFAULT: '#c52020', foreground: '#fafafa' },
        success: { DEFAULT: '#21c45d', foreground: '#fafafa', text: '#157f3c' },
        warning: { DEFAULT: '#f59f0a', foreground: '#171717', text: '#b35309' },
        info: { DEFAULT: '#2463eb', foreground: '#fafafa' },
        brand: { DEFAULT: '#c3f910', foreground: '#1e2702' },
        'chat-accent': { DEFAULT: '#1d4fd7', foreground: '#ffffff' },
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
