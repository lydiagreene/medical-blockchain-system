import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Search, LayoutDashboard, FileText, ShieldCheck, Users,
  ClipboardList, AlertTriangle, UserCircle, PlusCircle, ScanFace,
  Building2, ArrowRight,
} from 'lucide-react'
import { listCredentials } from '../api/credentials'

const ALL_NAV = {
  ADMIN: [
    { icon: LayoutDashboard, label: 'Dashboard',       to: '/dashboard',          group: 'Navigation' },
    { icon: FileText,        label: 'All Credentials', to: '/admin/credentials',  group: 'Navigation' },
    { icon: Users,           label: 'Pending Users',   to: '/admin/users',        group: 'Navigation' },
    { icon: Building2,       label: 'Institutions',    to: '/admin/institutions', group: 'Navigation' },
    { icon: ClipboardList,   label: 'Audit Log',       to: '/admin/audit-log',    group: 'Navigation' },
    { icon: AlertTriangle,   label: 'Fraud Monitor',   to: '/admin/fraud',        group: 'Navigation' },
    { icon: UserCircle,      label: 'Profile',         to: '/profile',            group: 'Navigation' },
  ],
  ISSUER: [
    { icon: LayoutDashboard, label: 'Dashboard',        to: '/dashboard',      group: 'Navigation' },
    { icon: PlusCircle,      label: 'Issue Credential', to: '/issuer/issue',   group: 'Navigation' },
    { icon: FileText,        label: 'My Credentials',   to: '/issuer/list',    group: 'Navigation' },
    { icon: UserCircle,      label: 'Profile',          to: '/profile',        group: 'Navigation' },
  ],
  VERIFIER: [
    { icon: LayoutDashboard, label: 'Dashboard',        to: '/dashboard',             group: 'Navigation' },
    { icon: ShieldCheck,     label: 'Verify Credential',to: '/verifier/verify',       group: 'Navigation' },
    { icon: ScanFace,        label: 'Face Verify',      to: '/verifier/face-verify',  group: 'Navigation' },
    { icon: UserCircle,      label: 'Profile',          to: '/profile',               group: 'Navigation' },
  ],
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function CommandPalette({ open, onClose }) {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  const [query, setQuery]               = useState('')
  const [credResults, setCredResults]   = useState([])
  const [credLoading, setCredLoading]   = useState(false)
  const [cursor, setCursor]             = useState(0)

  const debouncedQuery = useDebounce(query, 300)

  const role   = user?.is_superuser ? 'ADMIN' : user?.role
  const navItems = ALL_NAV[role] ?? []

  const filteredNav = query.trim()
    ? navItems.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : navItems

  useEffect(() => {
    if (!open) { setQuery(''); setCredResults([]); setCursor(0) }
    else setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const searchCreds = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setCredResults([]); return }
    setCredLoading(true)
    try {
      const { data } = await listCredentials({ q, page_size: 5 })
      setCredResults((data.results ?? data).slice(0, 5))
    } catch { setCredResults([]) }
    finally { setCredLoading(false) }
  }, [])

  useEffect(() => { searchCreds(debouncedQuery) }, [debouncedQuery, searchCreds])

  const credItems = credResults.map(c => ({
    icon: FileText,
    label: c.practitioner_name,
    sub: `${c.license_number} · ${c.status}`,
    to: `/credentials/${c.credential_id}`,
    group: 'Credentials',
  }))

  const allItems = [...filteredNav, ...credItems]

  useEffect(() => { setCursor(0) }, [allItems.length])

  const go = (to) => { navigate(to); onClose() }

  const handleKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && allItems[cursor]) go(allItems[cursor].to)
    if (e.key === 'Escape') onClose()
  }

  useEffect(() => {
    const el = listRef.current?.children[cursor]
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  const groups = [...new Set(allItems.map(i => i.group))]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520,
        background: '#0B1527',
        border: '1px solid #1A2744',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #0F1F38' }}>
          <Search size={16} style={{ color: '#475569', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages or credentials…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 14, color: '#F1F5F9', caretColor: '#00D4A8',
            }}
          />
          {credLoading && (
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #1A2744', borderTopColor: '#00D4A8', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          )}
          <kbd style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: '#0F1F38', color: '#475569', border: '1px solid #1A2744', flexShrink: 0 }}>ESC</kbd>
        </div>

        {/* results */}
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0' }} ref={listRef}>
          {allItems.length === 0 && !credLoading && query.length > 0 && (
            <p style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#334155' }}>
              No results for "{query}"
            </p>
          )}
          {allItems.length === 0 && !query && (
            <p style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#334155' }}>
              Type to search pages or credentials
            </p>
          )}

          {groups.map(g => {
            const items = allItems.filter(i => i.group === g)
            const globalStart = allItems.findIndex(i => i.group === g)
            return (
              <div key={g}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#1E3A5F', padding: '6px 16px 3px' }}>
                  {g}
                </p>
                {items.map((item, idx) => {
                  const globalIdx = globalStart + idx
                  const Icon = item.icon
                  const active = globalIdx === cursor
                  return (
                    <button key={item.to + idx} onMouseDown={() => go(item.to)}
                      onMouseEnter={() => setCursor(globalIdx)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 16px', background: active ? 'rgba(0,212,168,0.08)' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                      }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: active ? 'rgba(0,212,168,0.12)' : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={13} style={{ color: active ? '#00D4A8' : '#64748B' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: active ? '#F1F5F9' : '#94A3B8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.label}
                        </p>
                        {item.sub && (
                          <p style={{ fontSize: 10, color: '#475569', margin: 0, marginTop: 1 }}>{item.sub}</p>
                        )}
                      </div>
                      {active && <ArrowRight size={12} style={{ color: '#00D4A8', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* footer hint */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #0F1F38', display: 'flex', gap: 14, alignItems: 'center' }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#334155' }}>
              <kbd style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#0F1F38', color: '#475569', border: '1px solid #1A2744' }}>{k}</kbd>
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
