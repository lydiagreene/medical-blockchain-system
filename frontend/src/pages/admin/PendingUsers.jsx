import { useEffect, useState } from 'react'
import {
  UserCheck, UserX, Users, Building2, Mail, Clock,
  ShieldOff, LockOpen, Search, ShieldCheck,
} from 'lucide-react'
import {
  getPendingUsers, approveUser, rejectUser,
  getAllUsers, resetUserTotp, unlockUser,
} from '../../api/admin'
import { useToast } from '../../context/ToastContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const C = {
  card: { background: '#fff', border: '1px solid #E8EDF5', borderRadius: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' },
  acc:  '#00D4A8',
  text: '#0F172A',
  sub:  '#64748B',
  mut:  '#94A3B8',
}

const ROLE_META = {
  ISSUER:   { label: 'Issuer',   bg: 'rgba(59,130,246,0.1)',  text: '#2563EB',  border: 'rgba(59,130,246,0.2)'  },
  VERIFIER: { label: 'Verifier', bg: 'rgba(0,212,168,0.1)',   text: '#0D9488',  border: 'rgba(0,212,168,0.2)'   },
  ADMIN:    { label: 'Admin',    bg: 'rgba(139,92,246,0.1)',  text: '#7C3AED',  border: 'rgba(139,92,246,0.2)'  },
}

const AVATAR_GRAD = {
  ISSUER:   'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.05))',
  VERIFIER: 'linear-gradient(135deg,rgba(0,212,168,0.2),rgba(0,212,168,0.05))',
  ADMIN:    'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(139,92,246,0.05))',
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, background: C.acc, borderRadius: 2 }} />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mut, margin: 0 }}>{children}</p>
    </div>
  )
}

// ── Pending users tab ────────────────────────────────────────────────────────

function PendingTab({ toast }) {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(null)

  const load = async () => {
    setLoading(true)
    try { const { data } = await getPendingUsers(); setUsers(data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleApprove = async id => {
    setActing(id)
    try { const { data } = await approveUser(id); toast(data.detail, 'success'); load() }
    catch (err) { toast(err.response?.data?.detail || 'Error approving user.', 'error') }
    finally { setActing(null) }
  }

  const handleReject = async (id, name) => {
    if (!window.confirm(`Reject and delete account for ${name}?`)) return
    setActing(id)
    try { const { data } = await rejectUser(id); toast(data.detail, 'success'); load() }
    catch (err) { toast(err.response?.data?.detail || 'Error rejecting user.', 'error') }
    finally { setActing(null) }
  }

  if (loading) return <Spinner />

  if (!users.length) return (
    <div style={{ ...C.card, padding: '64px 20px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Users size={26} style={{ color: '#16A34A' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>All caught up</p>
      <p style={{ fontSize: 13, color: C.mut, margin: 0 }}>No accounts are waiting for review.</p>
    </div>
  )

  return (
    <div>
      <SectionLabel>Review requests ({users.length})</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map(u => {
          const rm = ROLE_META[u.role] || ROLE_META.VERIFIER
          const isActing = acting === u.id
          return (
            <div key={u.id} style={{ ...C.card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: AVATAR_GRAD[u.role] || AVATAR_GRAD.VERIFIER, border: `1px solid ${rm.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: rm.text }}>
                {u.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.username}</span>
                  <RoleBadge rm={rm} />
                  {u.email_verified && <VerifiedBadge />}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  <Meta icon={<Mail size={12} />}>{u.email}</Meta>
                  {u.institution_name && <Meta icon={<Building2 size={12} />}>{u.institution_name}</Meta>}
                  {u.date_joined && <Meta icon={<Clock size={11} />}>Applied {fmt(u.date_joined)}</Meta>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <ActionBtn color="#00D4A8" hoverColor="#00BFA0" disabled={isActing} onClick={() => handleApprove(u.id)}>
                  <UserCheck size={14} />{isActing ? 'Working…' : 'Approve'}
                </ActionBtn>
                <ActionBtn color="#FEF2F2" hoverColor="#FEE2E2" textColor="#B91C1C" border="#FECACA" hoverBorder="#FCA5A5" disabled={isActing} onClick={() => handleReject(u.id, u.username)}>
                  <UserX size={14} />Reject
                </ActionBtn>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── All users tab ─────────────────────────────────────────────────────────────

function AllUsersTab({ toast }) {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(null)
  const [q, setQ]             = useState('')

  const load = async (query = '') => {
    setLoading(true)
    try { const { data } = await getAllUsers(query); setUsers(data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleReset2FA = async (id, name) => {
    if (!window.confirm(`Reset 2FA for ${name}? They will be required to set up 2FA again on next login.`)) return
    setActing(`totp-${id}`)
    try {
      const { data } = await resetUserTotp(id)
      toast(data.detail, 'success')
      load(q)
    } catch (err) { toast(err.response?.data?.detail || 'Error resetting 2FA.', 'error') }
    finally { setActing(null) }
  }

  const handleUnlock = async (id, name) => {
    setActing(`lock-${id}`)
    try {
      const { data } = await unlockUser(id)
      toast(data.detail, 'success')
      load(q)
    } catch (err) { toast(err.response?.data?.detail || 'Error unlocking.', 'error') }
    finally { setActing(null) }
  }

  const handleSearch = e => {
    e.preventDefault()
    load(q)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.mut }} />
          <input
            value={q} onChange={e => setQ(e.target.value)} placeholder="Search by username or email…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid #E8EDF5', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" style={{ padding: '9px 16px', borderRadius: 10, background: C.acc, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#06101F' }}>
          Search
        </button>
      </form>

      {loading ? <Spinner /> : !users.length ? (
        <div style={{ ...C.card, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: C.mut, margin: 0 }}>No users found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => {
            const rm = ROLE_META[u.role] || ROLE_META.VERIFIER
            const isLocked = u.locked_until && new Date(u.locked_until) > new Date()
            return (
              <div key={u.id} style={{ ...C.card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: AVATAR_GRAD[u.role] || AVATAR_GRAD.VERIFIER, border: `1px solid ${rm.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: rm.text }}>
                  {u.username[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{u.username}</span>
                    <RoleBadge rm={rm} />
                    {u.totp_enabled && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(0,212,168,0.1)', color: '#0D9488', border: '1px solid rgba(0,212,168,0.2)' }}>2FA ON</span>
                    )}
                    {!u.is_approved && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(234,179,8,0.1)', color: '#B45309', border: '1px solid rgba(234,179,8,0.2)' }}>PENDING</span>
                    )}
                    {isLocked && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#B91C1C', border: '1px solid rgba(239,68,68,0.2)' }}>LOCKED</span>
                    )}
                    {u.email_verified && <VerifiedBadge />}
                  </div>
                  <span style={{ fontSize: 11, color: C.mut }}>{u.email}</span>
                </div>

                {/* Security actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {u.totp_enabled && (
                    <button
                      disabled={acting === `totp-${u.id}`}
                      onClick={() => handleReset2FA(u.id, u.username)}
                      title="Reset 2FA — user must re-setup on next login"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#B91C1C', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      <ShieldOff size={12} />{acting === `totp-${u.id}` ? '…' : 'Reset 2FA'}
                    </button>
                  )}
                  {isLocked && (
                    <button
                      disabled={acting === `lock-${u.id}`}
                      onClick={() => handleUnlock(u.id, u.username)}
                      title="Clear account lockout"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(0,212,168,0.25)', background: 'rgba(0,212,168,0.06)', color: '#0D9488', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      <LockOpen size={12} />{acting === `lock-${u.id}` ? '…' : 'Unlock'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E8EDF5', borderTopColor: C.acc, animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

function RoleBadge({ rm }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rm.bg, color: rm.text, border: `1px solid ${rm.border}`, letterSpacing: '0.04em' }}>
      {rm.label}
    </span>
  )
}

function VerifiedBadge() {
  return (
    <span title="Email verified" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(59,130,246,0.08)', color: '#2563EB', border: '1px solid rgba(59,130,246,0.2)' }}>
      <ShieldCheck size={9} />Email ✓
    </span>
  )
}

function Meta({ icon, children }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.sub }}>
      <span style={{ color: C.mut }}>{icon}</span>{children}
    </span>
  )
}

function ActionBtn({ color, hoverColor, textColor = '#06101F', border, hoverBorder, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: `1px solid ${border || 'transparent'}`, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#E2E8F0' : color, color: disabled ? C.mut : textColor, fontSize: 12, fontWeight: 700, transition: 'all 0.15s', opacity: disabled ? 0.6 : 1 }}
      onMouseEnter={e => { if (!disabled && hoverColor) e.currentTarget.style.background = hoverColor; if (!disabled && hoverBorder) e.currentTarget.style.borderColor = hoverBorder }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = color; if (border) e.currentTarget.style.borderColor = border } }}>
      {children}
    </button>
  )
}

const fmt = d => new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PendingUsers() {
  useDocumentTitle('Manage Users')
  const toast = useToast()
  const [tab, setTab] = useState('pending') // 'pending' | 'all'

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.mut, marginBottom: 4 }}>Administrator</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>User Management</h1>
        <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>Approve accounts, manage 2FA, and unlock users</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[
          { id: 'pending', label: 'Pending Approval' },
          { id: 'all',     label: 'All Users' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? C.text : C.mut, boxShadow: tab === t.id ? '0 1px 3px rgba(15,23,42,0.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pending'
        ? <PendingTab toast={toast} />
        : <AllUsersTab toast={toast} />
      }
    </div>
  )
}
