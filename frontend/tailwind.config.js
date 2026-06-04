/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Spotify Encore × Medical — design tokens
        enc: {
          base:     '#060D1F',   // page background
          surface:  '#0D1829',   // card / section bg
          overlay:  '#142038',   // hover overlay
          border:   '#1E2D42',   // subtle borders
          accent:   '#00E5A0',   // primary CTA (medical teal)
          blue:     '#4A9EFF',   // blockchain / tech blue
          purple:   '#A78BFA',   // IPFS / crypto purple
          text:     '#FFFFFF',   // primary text
          subdued:  '#7B8FA6',   // secondary text
          muted:    '#3D5068',   // tertiary / placeholder
          positive: '#22C55E',   // success
          danger:   '#EF4444',   // error
        },
        // keep existing brand for dashboard
        brand: {
          50:  '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb',
          700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
        navy: { 800: '#0f172a', 900: '#060e1f' },
      },
      fontFamily: {
        sans:   ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display:['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        card:        '0 1px 3px rgba(0,0,0,0.08)',
        'card-hover':'0 4px 12px rgba(0,0,0,0.1)',
        'glow-teal': '0 0 40px rgba(0,229,160,0.25)',
        'glow-blue': '0 0 40px rgba(74,158,255,0.25)',
      },
      animation: {
        'float':        'float 6s ease-in-out infinite',
        'float-slow':   'float 9s ease-in-out infinite',
        'pulse-glow':   'pulseGlow 3s ease-in-out infinite',
        'fade-up':      'fadeUp 0.6s ease both',
        'spin-slow':    'spin 20s linear infinite',
        'dash':         'dash 2s linear infinite',
      },
      keyframes: {
        float:      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-16px)' } },
        pulseGlow:  { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        fadeUp:     { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        dash:       { to: { strokeDashoffset: '-20' } },
      },
      borderRadius: {
        xl: '12px', '2xl': '16px', '3xl': '20px',
      },
    },
  },
  plugins: [],
}
