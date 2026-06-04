import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, XCircle, Clock, PlusCircle, ChevronRight, Zap } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import { MonthBar, StatusPie } from '../../components/MiniChart'
import { getStats } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { fmtDate } from '../../utils/date'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const C = {
  get card() { return { background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } },
  acc:  'var(--clr-accent)',
  text: 'var(--app-text)',
  sub:  'var(--app-sub)',
  mut:  'var(--app-muted)',
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, background: C.acc, borderRadius: 2 }} />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mut, margin: 0 }}>{children}</p>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function IssuerDashboard() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { getStats().then(r => setStats(r.data)).finally(() => setLoading(false)) }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--app-card-bdr)', borderTopColor: 'var(--clr-accent)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.mut, marginBottom: 4 }}>
            {greeting()}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
            {user?.username}
          </h1>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{user?.institution_name || 'Issuer Account'}</p>
        </div>
        <Link to="/issuer/issue" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
          borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none',
          background: C.acc, color: '#06101F',
        }}>
          <PlusCircle size={15} />Issue Credential
        </Link>
      </div>

      {/* stats */}
      <div>
        <SectionLabel>Your credentials</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
          {[
            { title: 'Total Issued', value: stats?.total_credentials,   colour: '#4A9EFF', icon: <FileText size={15} /> },
            { title: 'Active',       value: stats?.active_credentials,  colour: '#00D4A8', icon: <CheckCircle size={15} /> },
            { title: 'Revoked',      value: stats?.revoked_credentials, colour: '#F87171', icon: <XCircle size={15} /> },
            { title: 'Expired',      value: stats?.expired_credentials, colour: '#94A3B8', icon: <Clock size={15} /> },
          ].map(s => (
            <div key={s.title} style={{ ...C.card, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mut, margin: 0 }}>{s.title}</p>
                <div style={{ color: s.colour }}>{s.icon}</div>
              </div>
              <p style={{ fontSize: 26, fontWeight: 900, color: s.colour, margin: 0, letterSpacing: '-0.02em' }}>{(s.value ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* charts */}
      <div>
        <SectionLabel>Activity</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <div style={{ ...C.card, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mut, marginBottom: 16 }}>
              Issued — last 6 months
            </p>
            <MonthBar labels={stats?.chart_monthly_labels} data={stats?.chart_monthly_data} colour="blue" height={150} />
          </div>
          <div style={{ ...C.card, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mut, marginBottom: 8 }}>
              Status breakdown
            </p>
            <StatusPie active={stats?.active_credentials} revoked={stats?.revoked_credentials} expired={stats?.expired_credentials} height={130} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
              {[['#10B981', 'Active'], ['#EF4444', 'Revoked'], ['#94A3B8', 'Expired']].map(([clr, lbl]) => (
                <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.sub }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: clr, display: 'inline-block' }} />{lbl}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* quick action banner */}
      <div style={{
        borderRadius: 16, padding: 24, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg,#0F2846,#0A1E38)',
        border: '1px solid #1A3A5C',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,212,168,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(74,158,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,212,168,0.15)', border: '1px solid rgba(0,212,168,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} style={{ color: C.acc }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Issue a new credential</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Register a practitioner's medical qualification on the blockchain</p>
            </div>
          </div>
          <Link to="/issuer/issue" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none',
            background: C.acc, color: '#06101F', flexShrink: 0,
          }}>
            <PlusCircle size={14} />Get Started
          </Link>
        </div>
      </div>

      {/* recent table */}
      <div>
        <SectionLabel>Recently issued</SectionLabel>
        <div style={{ ...C.card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--app-card-bdr)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Latest credentials</p>
            <Link to="/issuer/list" style={{ fontSize: 12, fontWeight: 700, color: C.acc, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--app-card-bdr)' }}>
                {['Practitioner', 'Qualification', 'License No.', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mut }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!stats?.recent_credentials?.length
                ? <tr><td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: C.mut }}>No credentials issued yet.</td></tr>
                : stats.recent_credentials.map(c => (
                  <tr key={c.credential_id} style={{ borderBottom: '1px solid var(--app-card-bdr)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: C.text }}>{c.practitioner_name}</td>
                    <td style={{ padding: '11px 20px', fontSize: 13, color: C.sub }}>{c.qualification}</td>
                    <td style={{ padding: '11px 20px', fontSize: 11, fontFamily: 'monospace', color: C.mut }}>{c.license_number}</td>
                    <td style={{ padding: '11px 20px' }}><StatusBadge status={c.status} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
