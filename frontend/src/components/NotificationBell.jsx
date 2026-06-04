import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Users, AlertTriangle, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getStats } from '../api/auth'

function buildNotifications(stats) {
  if (!stats) return []
  const items = []

  if (stats.pending_users > 0) {
    items.push({
      id: 'pending_users',
      icon: Users,
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#3B82F6',
      title: `${stats.pending_users} user${stats.pending_users > 1 ? 's' : ''} awaiting approval`,
      sub: 'Review pending registrations',
      to: '/admin/users',
      urgent: stats.pending_users > 3,
    })
  }

  // API field is today_fraud_flags
  const fraudToday = stats.today_fraud_flags ?? stats.fraud_flags_today ?? 0
  if (fraudToday > 0) {
    items.push({
      id: 'fraud_today',
      icon: AlertTriangle,
      iconBg: 'rgba(239,68,68,0.12)',
      iconColor: '#EF4444',
      title: `${fraudToday} fraud flag${fraudToday > 1 ? 's' : ''} today`,
      sub: 'Check the fraud monitor',
      to: '/admin/fraud',
      urgent: true,
    })
  }

  // expiring_soon is optional — only shown if API provides it
  const expiring = stats.expiring_soon ?? 0
  if (expiring > 0) {
    items.push({
      id: 'expiring_soon',
      icon: Clock,
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#F59E0B',
      title: `${expiring} credential${expiring > 1 ? 's' : ''} expiring soon`,
      sub: 'View all credentials',
      to: '/admin/credentials',
      urgent: false,
    })
  }

  return items
}

export default function NotificationBell() {
  const [open, setOpen]           = useState(false)
  const [notifs, setNotifs]       = useState([])
  const [read, setRead]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif_read') || '[]') } catch { return [] }
  })
  const [loading, setLoading]     = useState(false)
  const panelRef                  = useRef(null)
  const navigate                  = useNavigate()

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getStats()
      setNotifs(buildNotifications(data))
    } catch { /* silently ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifs.filter(n => !read.includes(n.id))
  const count  = unread.length

  const markAllRead = () => {
    const ids = notifs.map(n => n.id)
    setRead(ids)
    localStorage.setItem('notif_read', JSON.stringify(ids))
  }

  const handleClick = notif => {
    const newRead = [...new Set([...read, notif.id])]
    setRead(newRead)
    localStorage.setItem('notif_read', JSON.stringify(newRead))
    setOpen(false)
    navigate(notif.to)
  }

  const hasUrgent = unread.some(n => n.urgent)

  return (
    <div className="relative" ref={panelRef}>
      {/* bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs() }}
        title="Notifications"
        style={{
          position: 'relative',
          width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: open
            ? 'rgba(0,212,168,0.12)'
            : hasUrgent
              ? 'rgba(239,68,68,0.1)'
              : 'rgba(255,255,255,0.06)',
          color: open ? '#00D4A8' : hasUrgent ? '#F87171' : '#94A3B8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
        <Bell size={14} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 14, height: 14, borderRadius: 7,
            background: hasUrgent ? '#EF4444' : '#F59E0B',
            color: '#fff', fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
            border: '1.5px solid #0B1527',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 38, right: 0, zIndex: 200,
          width: 312, borderRadius: 14,
          background: '#0B1527',
          border: '1px solid #162236',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {/* header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px 10px',
            borderBottom: '1px solid #162236',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em' }}>Notifications</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {count > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 10, fontWeight: 600, color: '#00D4A8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6 }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2 }}>
                <X size={12} />
              </button>
            </div>
          </div>

          {/* body */}
          {loading ? (
            <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #162236', borderTopColor: '#00D4A8', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: '28px 14px', textAlign: 'center' }}>
              <Bell size={24} style={{ color: '#1E3A5F', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>All caught up!</p>
              <p style={{ fontSize: 11, color: '#334155', marginTop: 3 }}>No alerts at this time.</p>
            </div>
          ) : (
            <div>
              {notifs.map(n => {
                const isUnread = !read.includes(n.id)
                const Icon = n.icon
                return (
                  <button key={n.id} onClick={() => handleClick(n)} style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', background: isUnread ? 'rgba(0,212,168,0.03)' : 'transparent',
                    border: 'none', borderBottom: '1px solid #0F1F38', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(0,212,168,0.03)' : 'transparent'}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: n.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={13} style={{ color: n.iconColor }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: isUnread ? 700 : 600, color: isUnread ? '#E2E8F0' : '#94A3B8', margin: 0, lineHeight: 1.35 }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: 10, color: '#475569', marginTop: 2, lineHeight: 1.3 }}>
                        {n.sub}
                      </p>
                    </div>
                    {isUnread && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.urgent ? '#EF4444' : '#00D4A8', flexShrink: 0, marginTop: 4 }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
