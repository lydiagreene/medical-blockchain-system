const THEME = {
  ACTIVE:  { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' },
  REVOKED: { bg: '#FEE2E2', text: '#B91C1C', dot: '#EF4444' },
  EXPIRED: { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  PENDING: { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
}

export default function StatusBadge({ status }) {
  const t = THEME[status] ?? THEME.EXPIRED
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
      style={{ background: t.bg, color: t.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.dot }} />
      {status}
    </span>
  )
}
