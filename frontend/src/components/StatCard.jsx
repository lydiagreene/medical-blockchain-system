const THEME = {
  blue:   { grad: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)', icon: '#2563EB', num: '#1E3A8A' },
  green:  { grad: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)', icon: '#16A34A', num: '#14532D' },
  red:    { grad: 'linear-gradient(135deg,#FEF2F2,#FECACA)', icon: '#DC2626', num: '#7F1D1D' },
  amber:  { grad: 'linear-gradient(135deg,#FFFBEB,#FDE68A)', icon: '#D97706', num: '#78350F' },
  cyan:   { grad: 'linear-gradient(135deg,#ECFEFF,#A5F3FC)', icon: '#0891B2', num: '#164E63' },
  purple: { grad: 'linear-gradient(135deg,#F5F3FF,#DDD6FE)', icon: '#7C3AED', num: '#2E1065' },
  teal:   { grad: 'linear-gradient(135deg,#F0FDFA,#99F6E4)', icon: '#0D9488', num: '#134E4A' },
  gray:   { grad: 'linear-gradient(135deg,#F8FAFC,#E2E8F0)', icon: '#475569', num: '#1E293B' },
}

export default function StatCard({ title, value, icon, colour = 'blue', sub, delta }) {
  const t = THEME[colour] || THEME.blue
  return (
    <div style={{
      background: 'var(--app-card)',
      border: '1px solid var(--app-card-bdr)',
      borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: t.grad, opacity: 0.4, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--app-muted)' }}>
          {title}
        </p>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: t.grad, color: t.icon,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          {icon}
        </div>
      </div>

      <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--app-text)' }}>
        {value ?? '—'}
      </p>

      {(sub || delta !== undefined) && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {delta !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 700, color: delta >= 0 ? '#16A34A' : '#DC2626' }}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
            </span>
          )}
          {sub && <p style={{ fontSize: 12, color: 'var(--app-muted)' }}>{sub}</p>}
        </div>
      )}
    </div>
  )
}
