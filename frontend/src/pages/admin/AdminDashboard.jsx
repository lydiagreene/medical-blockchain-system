import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, XCircle, Users, AlertTriangle, Clock, Activity, ChevronRight } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import { TrendArea, MonthBar, StatusPie } from '../../components/MiniChart'
import { getStats } from '../../api/auth'
import { fmtDate } from '../../utils/date'
import useDocumentTitle from '../../hooks/useDocumentTitle'

/* ── animated counter ─────────────────────────────────────────────────────── */
function AnimCount({ to = 0 }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!to) { setN(0); return }
    let v = 0
    const step = Math.max(1, Math.ceil(to / 40))
    const id = setInterval(() => {
      v = Math.min(v + step, to)
      setN(v)
      if (v >= to) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [to])
  return <span ref={ref}>{n.toLocaleString()}</span>
}

/* ── skeleton ──────────────────────────────────────────────────────────────── */
function Skeleton({ h = 16, w = '100%', r = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, var(--app-card-bdr) 25%, rgba(255,255,255,0.04) 50%, var(--app-card-bdr) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, background: 'var(--clr-accent)', borderRadius: 2 }} />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--app-muted)', margin: 0 }}>{children}</p>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div style={{ background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton h={12} w={80} />
      <Skeleton h={28} w={60} />
      <Skeleton h={10} w={100} />
    </div>
  )
}

export default function AdminDashboard() {
  useDocumentTitle('Dashboard')
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { getStats().then(r => setStats(r.data)).finally(() => setLoading(false)) }, [])

  const card = { background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes shimmer { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }`}</style>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--app-muted)', marginBottom: 4 }}>
            Administrator Portal
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--app-text)', margin: 0 }}>
            System Overview
          </h1>
          <p style={{ fontSize: 13, color: 'var(--app-sub)', marginTop: 4 }}>VerifyDoc Uganda — Blockchain Medical Credential Platform</p>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {stats?.pending_users > 0 && (
              <Link to="/admin/users" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                background: 'rgba(234,179,8,0.12)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.25)',
              }}>
                <Users size={13} />{stats.pending_users} Pending
              </Link>
            )}
            <Link to="/admin/credentials" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none',
              background: 'var(--clr-accent)', color: '#06101F',
            }}>
              <FileText size={13} />All Credentials
            </Link>
          </div>
        )}
      </div>

      {/* alerts */}
      {!loading && (stats?.pending_users > 0 || stats?.today_fraud_flags > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats?.pending_users > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <Clock size={15} style={{ color: '#FCD34D', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#FCD34D', flex: 1 }}>
                {stats.pending_users} account{stats.pending_users !== 1 ? 's' : ''} awaiting approval
              </span>
              <Link to="/admin/users" style={{ fontSize: 12, fontWeight: 700, color: '#FCD34D', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                Review <ChevronRight size={13} />
              </Link>
            </div>
          )}
          {stats?.today_fraud_flags > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={15} style={{ color: '#F87171', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#F87171', flex: 1 }}>
                {stats.today_fraud_flags} suspicious verification{stats.today_fraud_flags !== 1 ? 's' : ''} flagged today
              </span>
              <Link to="/admin/fraud" style={{ fontSize: 12, fontWeight: 700, color: '#F87171', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                Review <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* stat cards */}
      <div>
        <SectionLabel>Credentials at a glance</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          {loading
            ? Array(6).fill(0).map((_, i) => <StatSkeleton key={i} />)
            : [
              { title: 'Total',         value: stats?.total_credentials,   icon: <FileText size={16} />,    colour: '#4A9EFF' },
              { title: 'Active',        value: stats?.active_credentials,  icon: <CheckCircle size={16} />, colour: '#00D4A8' },
              { title: 'Revoked',       value: stats?.revoked_credentials, icon: <XCircle size={16} />,     colour: '#F87171' },
              { title: 'Expired',       value: stats?.expired_credentials, icon: <Clock size={16} />,       colour: '#94A3B8' },
              { title: 'Pending Users', value: stats?.pending_users,       icon: <Users size={16} />,       colour: '#FCD34D' },
              { title: 'Verifications', value: stats?.total_verifications, icon: <Activity size={16} />,   colour: '#A78BFA' },
            ].map(s => (
              <div key={s.title} style={{ ...card, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)', margin: 0 }}>{s.title}</p>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.colour }}>
                    {s.icon}
                  </div>
                </div>
                <p style={{ fontSize: 26, fontWeight: 900, color: s.colour, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  <AnimCount to={s.value ?? 0} />
                </p>
              </div>
            ))
          }
        </div>
      </div>

      {/* charts */}
      <div>
        <SectionLabel>Activity</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)', marginBottom: 16 }}>
              Issued — last 6 months
            </p>
            {loading ? <Skeleton h={150} /> : <MonthBar labels={stats?.chart_monthly_labels} data={stats?.chart_monthly_data} colour="blue" height={150} />}
          </div>

          <div style={{ ...card, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)', marginBottom: 16 }}>
              Verifications — last 30 days
            </p>
            {loading ? <Skeleton h={150} /> : <TrendArea labels={stats?.chart_daily_labels} data={stats?.chart_daily_data} colour="cyan" height={150} />}
          </div>

          <div style={{ ...card, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)', marginBottom: 8 }}>
              Status breakdown
            </p>
            {loading ? <Skeleton h={130} /> : (
              <>
                <StatusPie active={stats?.active_credentials} revoked={stats?.revoked_credentials} expired={stats?.expired_credentials} height={130} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 8 }}>
                  {[['#00D4A8', 'Active'], ['#F87171', 'Revoked'], ['#475569', 'Expired']].map(([clr, lbl]) => (
                    <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--app-sub)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: clr, display: 'inline-block' }} />{lbl}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* recent table */}
      <div>
        <SectionLabel>Recent credentials</SectionLabel>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--app-card-bdr)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>Recently issued</p>
            <Link to="/admin/credentials" style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--app-card-bdr)' }}>
                  {['Practitioner', 'Qualification', 'License No.', 'Expires', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--app-muted)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && Array(4).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--app-card-bdr)' }}>
                    {Array(5).fill(0).map((__, j) => (
                      <td key={j} style={{ padding: '14px 20px' }}><Skeleton h={12} w={j === 0 ? 120 : j === 2 ? 90 : 80} /></td>
                    ))}
                  </tr>
                ))}
                {!loading && !stats?.recent_credentials?.length && (
                  <tr><td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: 'var(--app-muted)' }}>No credentials yet.</td></tr>
                )}
                {!loading && stats?.recent_credentials?.map(c => (
                  <tr key={c.credential_id}
                    style={{ borderBottom: '1px solid var(--app-card-bdr)', transition: 'background 0.12s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: 'var(--app-text)', borderLeft: '3px solid transparent' }}
                      onMouseEnter={e => e.closest('tr').style.borderLeftColor = 'var(--clr-accent)'}
                      onMouseLeave={e => e.closest('tr').style.borderLeftColor = 'transparent'}>
                      {c.practitioner_name}
                    </td>
                    <td style={{ padding: '11px 20px', fontSize: 13, color: 'var(--app-sub)' }}>{c.qualification}</td>
                    <td style={{ padding: '11px 20px', fontSize: 11, fontFamily: 'monospace', color: 'var(--app-muted)' }}>{c.license_number}</td>
                    <td style={{ padding: '11px 20px', fontSize: 12, color: 'var(--app-sub)' }}>{fmtDate(c.license_expiry_date)}</td>
                    <td style={{ padding: '11px 20px' }}><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
