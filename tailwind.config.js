const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Geist', ...fontFamily.sans],
        mono: ['var(--font-geist-mono)', 'Geist Mono', ...fontFamily.mono],
      },
    },
  },
  plugins: [],
}