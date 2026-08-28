import type { Config } from 'tailwindcss';
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          600: '#4F46E5',
          700: '#4338CA',
        },
        grafite: { DEFAULT: '#0F172A', 800: '#1E293B' },
        success: { DEFAULT: '#10B981', 50: '#ECFDF5', 200: '#A7F3D0', 700: '#047857' },
        warning: { DEFAULT: '#F59E0B', 50: '#FFF7ED', 200: '#FED7AA', 700: '#B45309' },
        danger: { DEFAULT: '#EF4444', 50: '#FEF2F2', 200: '#FECACA', 700: '#B91C1C' },
        ink: { DEFAULT: '#0F172A', muted: '#64748B', faint: '#94A3B8' },
      },
    },
  },
  plugins: [],
};
export default config;
