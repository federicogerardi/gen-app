import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Geist', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-geist-mono)', 'Geist Mono', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
}

export default config