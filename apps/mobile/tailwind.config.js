/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        background: '#09090b',
        card: '#18181b',
        border: '#27272a',
        foreground: '#fafafa',
        muted: '#71717a',
        destructive: '#ef4444',
      },
    },
  },
  plugins: [],
};
