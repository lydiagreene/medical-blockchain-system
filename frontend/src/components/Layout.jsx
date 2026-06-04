import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, FileText, ShieldCheck, Users, ClipboardList,
  AlertTriangle, LogOut, Menu, UserCircle, PlusCircle, X, ScanFace,
  Sun, Moon, Building2, Search, Home, ChevronLeft,
} from 'lucide-react'
import { getPendingUsers } from '../api/admin'
import NotificationBell from './NotificationBell'
import CommandPalette from './CommandPalette'

const NAV = {
  ADMIN: [
    { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard',        group: 'overview' },
    { to: '/admin/credentials',   icon: FileText,        label: 'All Credentials',  group: 'manage' },
    { to: '/admin/users',         icon: Users,           label: 'Pending Users',    group: 'manage' },
    { to: '/admin/institutions',  icon: Building2,       label: 'Institutions',     group: 'manage' },
    { to: '/admin/audit-log',     icon: ClipboardList,   label: 'Audit Log',        group: 'manage' },
    { to: '/admin/fraud',         icon: AlertTriangle,   label: 'Fraud Monitor',    group: 'manage' },
    { to: '/profile',             icon: UserCircle,      label: 'Profile',          group: 'account' },
  ],
  ISSUER: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',        group: 'overview' },
    { to: '/issuer/issue', icon: PlusCircle,      label: 'Issue Credential', group: 'work' },
    { to: '/issuer/list',  icon: FileText,        label: 'My Credentials',   group: 'work' },
    { to: '/profile',      icon: UserCircle,      label: 'Profile',          group: 'account' },
  ],
  VERIFIER: [
    { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard',         group: 'overview' },
    { to: '/verifier/verify',      icon: ShieldCheck,     label: 'Verify Credential', group: 'work' },
    { to: '/verifier/face-verify', icon: ScanFace,        label: 'Face Verify',       group: 'work' },
    { to: '/profile',              icon: UserCircle,      label: 'Profile',           group: 'account' },
  ],
}

const ROLE_META = {
  ADMIN:    { label: 'Administrator', bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
  ISSUER:   { label: 'Issuer',        bg: 'rgba(59,130,246,0.15)', text: '#93C5FD' },
  VERIFIER: { label: 'Verifier',      bg: 'rgba(0,212,168,0.15)', text: '#5EEAD4' },
}

const GROUP_LABELS = { overview: 'Overview', manage: 'Management', work: 'Tools', account: 'Account' }

/* ── Nav (expanded) ─────────────────────────────────────────────────────────── */
function NavGroup({ links, onClose, pendingCount = 0 }) {
  const groups = [...new Set(links.map(l => l.group))]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {groups.map((g, gi) => {
        const items = links.filter(l => l.group === g)
        return (
          <div key={g}>
            {gi > 0 && (
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#2A3F5F', padding: '10px 12px 4px' }}>
                {GROUP_LABELS[g]}
              </p>
            )}
            {items.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/dashboard'} onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, margin: '1px 0',
                  fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: isActive ? 'rgba(0,212,168,0.1)' : 'transparent',
                  color: isActive ? '#00D4A8' : '#64748B',
                })}>
                {({ isActive }) => (
                  <>
                    <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>
                    {label === 'Pending Users' && pendingCount > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9,
                        background: '#EAB308', color: '#000', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0 5px', flexShrink: 0,
                      }}>{pendingCount}</span>
                    )}
                    {isActive && !(label === 'Pending Users' && pendingCount > 0) && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00D4A8', flexShrink: 0 }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ── Nav (collapsed — icon only) ────────────────────────────────────────────── */
function NavCollapsed({ links, pendingCount = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/dashboard'} title={label}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 10, margin: '0 auto',
            position: 'relative', textDecoration: 'none', transition: 'all 0.15s',
            background: isActive ? 'rgba(0,212,168,0.12)' : 'transparent',
            color: isActive ? '#00D4A8' : '#64748B',
          })}>
          {({ isActive }) => (
            <>
              <Icon size={17} style={{ opacity: isActive ? 1 : 0.7 }} />
              {label === 'Pending Users' && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%', background: '#EAB308',
                }} />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────────────── */
function Sidebar({ links, user, role, onLogout, onClose, pendingCount, collapsed }) {
  const rm = ROLE_META[role] || ROLE_META.VERIFIER
  const w = collapsed ? 64 : 232

  return (
    <div style={{
      width: w, flexShrink: 0,
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#06101F', borderRight: '1px solid #0F1F38',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>

      {/* brand */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0 12px' : '0 16px',
        height: 56, borderBottom: '1px solid #0F1F38', flexShrink: 0,
      }}>
        <Link to="/" title="VerifyDoc Uganda" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', overflow: 'hidden' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#00D4A8,#00A886)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={15} color="#06101F" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 14, lineHeight: 1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>VerifyDoc</div>
              <div style={{ color: '#00D4A8', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginTop: 1 }}>UGANDA</div>
            </div>
          )}
        </Link>
        {/* Mobile close button */}
        {!collapsed && (
          <button onClick={onClose} className="md:hidden" aria-label="Close navigation"
            style={{ color: '#475569', padding: 4, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
            <X size={17} />
          </button>
        )}
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 4px' : '12px 8px', overflowY: 'auto' }}>
        {collapsed
          ? <NavCollapsed links={links} pendingCount={pendingCount} />
          : <NavGroup links={links} onClose={onClose} pendingCount={pendingCount} />
        }
      </nav>

      {/* user footer */}
      <div style={{ padding: collapsed ? '12px 4px 8px' : '12px 8px 8px', borderTop: '1px solid #0F1F38', flexShrink: 0 }}>
        {collapsed ? (
          /* collapsed footer — avatar + logout icon stacked */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div title={user?.username} style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,rgba(0,212,168,0.2),rgba(0,212,168,0.05))',
              border: '1px solid rgba(0,212,168,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#00D4A8', cursor: 'default',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <button onClick={onLogout} title="Sign out"
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#F87171' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569' }}>
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          /* expanded footer */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg,rgba(0,212,168,0.2),rgba(0,212,168,0.05))',
                border: '1px solid rgba(0,212,168,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#00D4A8',
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                  {user?.username}
                </div>
                <div style={{ color: '#475569', fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.institution_name || user?.email}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: rm.bg, color: rm.text, flexShrink: 0, letterSpacing: '0.04em' }}>
                {rm.label}
              </span>
            </div>
            <button onClick={onLogout} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10, border: 'none', background: 'transparent',
              color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#F87171' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569' }}>
              <LogOut size={15} />Sign out
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Layout ──────────────────────────────────────────────────────────────────── */
export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [mobileOpen, setMobileOpen]         = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen]       = useState(false)
  const [pendingCount, setPendingCount]     = useState(0)

  // Ctrl+K command palette
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Pending users badge for admin
  useEffect(() => {
    if (user?.is_superuser || user?.role === 'ADMIN') {
      getPendingUsers().then(r => {
        const data = r.data
        const count = Array.isArray(data) ? data.length : (data?.count ?? 0)
        setPendingCount(count)
      }).catch(() => {})
    }
  }, [user])

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const isDark     = theme === 'dark'
  const topbarBg   = isDark ? '#0B1527' : '#fff'
  const topbarBdr  = isDark ? '#162236' : '#E8EDF5'
  const shellBg    = isDark ? '#060D1F' : '#F1F5F9'
  const titleClr   = isDark ? '#F1F5F9' : '#0F172A'

  const role  = user?.is_superuser ? 'ADMIN' : user?.role
  const links = NAV[role] || []
  const rm    = ROLE_META[role] || ROLE_META.VERIFIER

  const handleLogout = async () => { await signOut(); navigate('/login') }

  const allLinks  = Object.values(NAV).flat()
  const active    = allLinks.find(l => location.pathname === l.to || location.pathname.startsWith(l.to + '/'))
  const pageTitle = active?.label ?? 'Dashboard'

  const handleMenuClick = () => {
    // On mobile: open drawer; on desktop: toggle collapse
    if (window.innerWidth < 768) setMobileOpen(true)
    else setSidebarCollapsed(v => !v)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: shellBg }}>

      {/* desktop sidebar */}
      <div className="hidden md:flex" style={{ flexShrink: 0 }}>
        <Sidebar
          links={links} user={user} role={role}
          onLogout={handleLogout} onClose={() => {}}
          pendingCount={pendingCount}
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex-shrink-0">
            <Sidebar
              links={links} user={user} role={role}
              onLogout={handleLogout} onClose={() => setMobileOpen(false)}
              pendingCount={pendingCount}
              collapsed={false}
            />
          </div>
        </div>
      )}

      {/* main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* topbar */}
        <header style={{
          height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px',
          background: topbarBg, borderBottom: `1px solid ${topbarBdr}`,
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        }}>
          {/* Hamburger on mobile / collapse toggle on desktop */}
          <button
            onClick={handleMenuClick}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ color: '#64748B', padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexShrink: 0, borderRadius: 8, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#00D4A8' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}>
            {/* On desktop show ChevronLeft when expanded, Menu when collapsed; on mobile always Menu */}
            <span className="hidden md:flex" style={{ alignItems: 'center', justifyContent: 'center', transition: 'transform 0.22s' }}>
              {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
            </span>
            <span className="flex md:hidden">
              <Menu size={20} />
            </span>
          </button>

          {/* breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <Link to="/dashboard" style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#00D4A8'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748B'}>
              <Home size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              {rm.label}
            </Link>
            <span style={{ color: '#CBD5E1', fontSize: 12, flexShrink: 0 }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: titleClr, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pageTitle}
            </span>
          </div>

          {/* right controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Ctrl+K search — desktop */}
            <button onClick={() => setPaletteOpen(true)} title="Search (Ctrl+K)"
              className="hidden sm:flex"
              style={{
                alignItems: 'center', gap: 6, height: 28, padding: '0 10px',
                borderRadius: 7, border: `1px solid ${isDark ? '#162236' : '#E2E8F0'}`,
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: '#64748B', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00D4A8'; e.currentTarget.style.color = '#00D4A8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? '#162236' : '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}>
              <Search size={11} />
              <span style={{ fontWeight: 600 }}>Search</span>
              <kbd style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: isDark ? '#0F1F38' : '#F1F5F9', border: `1px solid ${isDark ? '#1A2744' : '#E2E8F0'}`, marginLeft: 2 }}>⌘K</kbd>
            </button>

            {/* Search icon — mobile */}
            <button onClick={() => setPaletteOpen(true)} className="flex sm:hidden" title="Search"
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: '#64748B', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={14} />
            </button>

            {/* Notifications — admin only */}
            {(user?.is_superuser || user?.role === 'ADMIN') && (
              <NotificationBell />
            )}

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#94A3B8' : '#64748B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Role badge — hidden when very narrow */}
            <span className="hidden sm:inline-block" style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: rm.bg, color: rm.text, letterSpacing: '0.04em',
            }}>
              {rm.label.toUpperCase()}
            </span>

            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg,rgba(0,212,168,0.15),rgba(0,212,168,0.04))',
              border: '1px solid rgba(0,212,168,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#00D4A8', cursor: 'default',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
