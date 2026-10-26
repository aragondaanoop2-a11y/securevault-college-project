/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0a0608',
          card: '#120a10',
          panel: '#0e080d',
          border: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.04)',
          glowMagenta: '#ec4899',
          glowOrange: '#f97316',
          glowPurple: '#a855f7',
          glowCyan: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'sparkle': 'sparkle 2.5s ease-in-out infinite',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        }
      }
    },
  },
  plugins: [],
}
