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
        // amber/red/indigo scales almost exactly (e.g. #111827 = gray-900, #059669 =
        // emerald-600) — those are used directly rather than re-declared here. The one
        // color genuinely custom to this app is the brand purple.
        primary: {
          DEFAULT: '#6C63FF',
          dark: '#4F46E5',
          darker: '#4338CA',
        },
      },
    },
  },
  plugins: [],
};
