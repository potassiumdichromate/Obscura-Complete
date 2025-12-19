/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        miden: {
          dark: '#0A0E27',
          darker: '#060915',
          blue: '#2563eb',
          cyan: '#06b6d4',
          purple: '#8b5cf6',
          accent: '#10b981',
          gold: '#f59e0b',
        },
        proof: {
          verified: '#10b981',
          pending: '#f59e0b',
          failed: '#ef4444',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(37, 99, 235, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(37, 99, 235, 0.8)' },
        }
      },
    },
  },
  plugins: [],
}
