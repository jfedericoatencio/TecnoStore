import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec3ff',
          400: '#59a2ff',
          500: '#3380fc',
          600: '#1b62f1',
          700: '#144dde',
          800: '#1741b4',
          900: '#173a8e',
          950: '#0f2557',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,37,87,.08), 0 4px 14px rgba(15,37,87,.06)',
      },
    },
  },
  plugins: [],
};
export default config;
