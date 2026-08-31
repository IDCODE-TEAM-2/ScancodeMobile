/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './index.ts',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // The app's existing design already matched Tailwind's default gray/emerald/
        // amber/red scales almost exactly (e.g. #111827 = gray-900) — those are used
        // directly rather than re-declared here.
        // Primary changed 2026-08-31 from the original brand purple (#6C63FF) to
        // Scancode's green/emerald identity, per direct user instruction. `DEFAULT` is
        // the flat-fill anchor (borders, text, non-gradient surfaces); `gradientStart`/
        // `gradientEnd` back the two-stop "mini gradient" used on primary CTA buttons
        // (see src/components/GradientButton.tsx) — deliberately a subtle emerald-500 ->
        // emerald-700 shift, not a dramatic multi-hue gradient.
        primary: {
          DEFAULT: '#059669',
          dark: '#047857',
          darker: '#065F46',
          gradientStart: '#10B981',
          gradientEnd: '#047857',
        },
      },
    },
  },
  plugins: [],
};
