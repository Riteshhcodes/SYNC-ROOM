import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'mint-primary': '#00f5d4',
        'mint-subtle': 'rgba(0, 245, 212, 0.15)',
        'mint-glow': 'rgba(0, 245, 212, 0.4)',
        'crimson-primary': '#ff6b35',
        'crimson-subtle': 'rgba(255, 107, 53, 0.15)',
        'crimson-glow': 'rgba(255, 107, 53, 0.4)',
        'bg-light': '#050508',
        'bg-card': 'rgba(255, 255, 255, 0.03)',
        'bg-elevated': 'rgba(255, 255, 255, 0.06)',
        glass: 'rgba(255, 255, 255, 0.03)',
        'glass-hover': 'rgba(255, 255, 255, 0.06)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'glass-border-bright': 'rgba(0, 245, 212, 0.35)',
        'text-primary': 'rgba(255, 255, 255, 0.92)',
        'text-secondary': 'rgba(255, 255, 255, 0.65)',
        'text-muted': 'rgba(255, 255, 255, 0.5)',
        'neon-teal': '#00f5d4',
        'neon-purple': '#667eea',
        'neon-fire': '#ff6b35',
        danger: '#f87171',
        success: '#00f5d4',
        warning: '#fbbf24',
      },
      fontFamily: {
        sans: ['Outfit', ...defaultTheme.fontFamily.sans],
        anime: ['Outfit', 'system-ui', 'sans-serif'],
        japanese: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        anime: '0 10px 40px -10px rgba(0, 245, 212, 0.15)',
        'anime-strong': '0 10px 40px -10px rgba(102, 126, 234, 0.25)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'total-concentration': 'totalConcentration 3s ease-in-out infinite',
        'mist-fade': 'mistFade 2s ease-out forwards',
        ripple: 'ripple 0.6s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
        'fly-crow': 'flyCrow 3s ease-in-out forwards',
      },
      keyframes: {
        totalConcentration: {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(0, 245, 212, 0.15)',
            borderColor: 'rgba(0, 245, 212, 0.25)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(0, 245, 212, 0.35)',
            borderColor: 'rgba(0, 245, 212, 0.6)',
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
    },
  },
  plugins: [],
};
