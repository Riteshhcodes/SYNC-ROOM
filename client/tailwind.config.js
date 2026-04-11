/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mint/Water Theme (Tanjiro/Giyu)
        'mint-primary': '#14b8a6', // Teal-500
        'mint-subtle': '#ccfbf1', // Teal-100
        'mint-glow': 'rgba(20, 184, 166, 0.4)',
        // Crimson/Flame Theme (Rengoku)
        'crimson-primary': '#ef4444', // Red-500
        'crimson-subtle': '#fee2e2', // Red-100
        'crimson-glow': 'rgba(239, 68, 68, 0.4)',
        // Backgrounds
        'bg-light': '#f8fafc', // Slate-50
        'bg-card': 'rgba(255, 255, 255, 0.8)',
        'bg-elevated': '#ffffff',
        // Glass
        'glass': 'rgba(255, 255, 255, 0.6)',
        'glass-hover': 'rgba(255, 255, 255, 0.8)',
        'glass-border': 'rgba(20, 184, 166, 0.15)',
        'glass-border-bright': 'rgba(20, 184, 166, 0.4)',
        // Text
        'text-primary': '#1e293b', // Slate-800
        'text-secondary': '#475569', // Slate-600
        'text-muted': '#94a3b8', // Slate-400
        // Semantic
        'danger': '#ef4444',
        'success': '#14b8a6',
        'warning': '#f59e0b',
      },
      fontFamily: {
        anime: ['Montserrat', 'system-ui', 'sans-serif'],
        japanese: ['"Noto Sans JP"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'anime': '0 10px 40px -10px rgba(20, 184, 166, 0.2), 0 0 20px rgba(20, 184, 166, 0.1)',
        'anime-strong': '0 10px 40px -10px rgba(20, 184, 166, 0.4), 0 0 30px rgba(20, 184, 166, 0.2)',
        'anime-inner': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'total-concentration': 'totalConcentration 3s ease-in-out infinite',
        'mist-fade': 'mistFade 2s ease-out forwards',
        'ripple': 'ripple 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'fly-crow': 'flyCrow 3s ease-in-out forwards',
      },
      keyframes: {
        totalConcentration: {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(20, 184, 166, 0.2), inset 0 0 10px rgba(20, 184, 166, 0.1)',
            borderColor: 'rgba(20, 184, 166, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(20, 184, 166, 0.6), inset 0 0 20px rgba(20, 184, 166, 0.2)',
            borderColor: 'rgba(20, 184, 166, 0.8)',
          },
        },
        mistFade: {
          '0%': { opacity: '0', filter: 'blur(10px)', transform: 'translateY(10px)' },
          '100%': { opacity: '1', filter: 'blur(0px)', transform: 'translateY(0)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        flyCrow: {
          '0%': { transform: 'translate(-100px, 100px) scale(0.5)', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translate(calc(100vw + 100px), -100px) scale(1)', opacity: '0' },
        },
      },
      backgroundImage: {
        'tanjiro-pattern': `linear-gradient(45deg, #ccfbf1 25%, transparent 25%, transparent 75%, #ccfbf1 75%, #ccfbf1),
                            linear-gradient(45deg, #ccfbf1 25%, transparent 25%, transparent 75%, #ccfbf1 75%, #ccfbf1)`,
      },
      backgroundSize: {
        'tanjiro': '60px 60px',
      },
    },
  },
  plugins: [],
};
