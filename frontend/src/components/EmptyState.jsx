const ILLUSTRATIONS = {
  credentials: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="10" y="18" width="60" height="44" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5"/>
      <rect x="18" y="28" width="28" height="3" rx="1.5" fill="#CBD5E1"/>
      <rect x="18" y="35" width="20" height="3" rx="1.5" fill="#E2E8F0"/>
      <rect x="18" y="42" width="24" height="3" rx="1.5" fill="#E2E8F0"/>
      <rect x="50" y="28" width="12" height="10" rx="3" fill="#E2E8F0"/>
      <circle cx="62" cy="52" r="12" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1.5"/>
      <path d="M57 52l3 3 5-5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  users: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="30" r="14" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5"/>
      <circle cx="40" cy="28" r="7" fill="#E2E8F0"/>
      <path d="M18 62c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="62" cy="54" r="10" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5"/>
      <path d="M62 50v4m0 0v4m0-4h-4m4 0h4" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  fraud: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <path d="M40 10L70 58H10L40 10Z" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M40 30v12" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="40" cy="48" r="1.8" fill="#F97316"/>
      <circle cx="14" cy="66" r="6" fill="#FEF2F2" stroke="#FECACA" strokeWidth="1.5"/>
      <path d="M14 63v3m0 0v3m0-3h-3m3 0h3" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  audit: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="14" y="12" width="40" height="52" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
      <rect x="22" y="24" width="24" height="2.5" rx="1.25" fill="#E2E8F0"/>
      <rect x="22" y="31" width="18" height="2.5" rx="1.25" fill="#E2E8F0"/>
      <rect x="22" y="38" width="20" height="2.5" rx="1.25" fill="#E2E8F0"/>
      <rect x="22" y="45" width="14" height="2.5" rx="1.25" fill="#F1F5F9"/>
      <circle cx="58" cy="58" r="12" fill="#F5F3FF" stroke="#DDD6FE" strokeWidth="1.5"/>
      <path d="M54 58h8M58 54v8" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  institutions: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="12" y="32" width="56" height="36" rx="4" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5"/>
      <path d="M40 12l28 20H12L40 12Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="22" y="46" width="10" height="12" rx="2" fill="#CBD5E1"/>
      <rect x="36" y="46" width="10" height="12" rx="2" fill="#CBD5E1"/>
      <rect x="50" y="46" width="10" height="12" rx="2" fill="#CBD5E1"/>
      <rect x="35" y="22" width="10" height="10" rx="2" fill="#fff" stroke="#E2E8F0" strokeWidth="1"/>
    </svg>
  ),
  search: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="36" cy="36" r="20" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
      <circle cx="36" cy="36" r="12" fill="#F1F5F9"/>
      <path d="M52 52l12 12" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round"/>
      <path d="M30 36h12M36 30v12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  default: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="16" y="16" width="48" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
      <path d="M32 40h16M40 32v16" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
}

const DEFAULTS = {
  credentials: { title: 'No credentials found', sub: 'Credentials issued by your institution will appear here.' },
  users:       { title: 'No pending users',      sub: 'New user registration requests will appear here for review.' },
  fraud:       { title: 'No fraud alerts',        sub: 'Suspicious activity flags will appear here when detected.' },
  audit:       { title: 'No audit entries',       sub: 'Activity logs will appear here once actions are performed.' },
  institutions:{ title: 'No institutions',        sub: 'Create your first institution to get started.' },
  search:      { title: 'No results found',       sub: 'Try adjusting your search query or filters.' },
  default:     { title: 'Nothing here yet',       sub: 'Check back later.' },
}

export default function EmptyState({
  type = 'default',
  title,
  sub,
  action,
  actionLabel = 'Get started',
  className = '',
}) {
  const illustration = ILLUSTRATIONS[type] ?? ILLUSTRATIONS.default
  const defaultText  = DEFAULTS[type]      ?? DEFAULTS.default

  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>{illustration}</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)', marginBottom: 6 }}>
        {title ?? defaultText.title}
      </p>
      <p style={{ fontSize: 13, color: 'var(--app-muted)', maxWidth: 280, lineHeight: 1.55, marginBottom: action ? 18 : 0 }}>
        {sub ?? defaultText.sub}
      </p>
      {action && (
        <button onClick={action}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: 'var(--clr-accent)', color: '#060D1F' }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
