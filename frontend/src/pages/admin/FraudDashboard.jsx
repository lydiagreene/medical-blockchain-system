import { useEffect, useState } from 'react'
import { AlertTriangle, Shield, ShieldOff, RefreshCw, Activity } from 'lucide-react'
import client from '../../api/client'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const C = {
  card: { background: '#fff', border: '1px solid #E8EDF5', borderRadius: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' },
  acc:  '#00D4A8',
  text: '#0F172A',
  sub:  '#64748B',
  mut:  '#94A3B8',
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, background: '#EF4444', borderRadius: 2 }} />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mut, margin: 0 }}>{children}</p>
    </div>
  )
}

function RiskLevel({ today }) {
  const level = today === 0 ? 'clean' : today < 3 ? 'low' : today < 10 ? 'medium' : 'high'
  const meta = {
    clean:  { label: 'All Clear',    bg: '#F0FDF4', border: '#BBF7D0', text: '#14532D', dot: '#22C55E' },
    low:    { label: 'Low Risk',     bg: '#FFFBEB', border: '#FDE68A', text: '#78350F', dot: '#F59E0B' },
    medium: { label: 'Medium Risk',  bg: '#FFF7ED', border: '#FED7AA', text: '#7C2D12', dot: '#EA580C' },
    high:   { label: 'High Risk',    bg: '#FEF2F2', border: '#FECACA', text: '#7F1D1D', dot: '#EF4444' },
  }[level]

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: meta.bg, border: `1px solid ${meta.border}` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, display: 'inline-block', animation: level !== 'clean' ? 'pulse 2s infinite' : undefined }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: meta.text }}>{meta.label}</span>
    </div>
  )
}

export default function FraudDashboard() {
  useDocumentTitle('Fraud Dashboard')
  const [data, setData]       = useState(null)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    client.get('/admin/fraud/', { params: { page } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const fmt   = iso => new Date(iso).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })
  const total = data?.total_flagged ?? 0
  const today = data?.today_flagged ?? 0

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.mut, marginBottom: 4 }}>
            Security Monitor
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
            Fraud Detection
          </h1>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>AI-flagged suspicious verification attempts</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RiskLevel today={today} />
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#F8FAFC', border: '1px solid #E8EDF5', color: C.sub, cursor: 'pointer' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {/* today */}
        <div style={{ borderRadius: 16, padding: 20, background: today > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${today > 0 ? '#FECACA' : '#BBF7D0'}`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 70, height: 70, borderRadius: '50%', background: today > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: today > 0 ? '#B91C1C' : '#15803D', margin: 0 }}>Flagged Today</p>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: today > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {today > 0 ? <AlertTriangle size={16} style={{ color: '#B91C1C' }} /> : <Shield size={16} style={{ color: '#15803D' }} />}
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: today > 0 ? '#7F1D1D' : '#14532D', margin: 0 }}>{today}</p>
        </div>

        {/* total */}
        <div style={{ ...C.card, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 70, height: 70, borderRadius: '50%', background: 'rgba(148,163,184,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mut, margin: 0 }}>Total Flagged</p>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldOff size={16} style={{ color: C.mut }} />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>{total}</p>
        </div>

        {/* detection rate */}
        <div style={{ ...C.card, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 70, height: 70, borderRadius: '50%', background: 'rgba(0,212,168,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mut, margin: 0 }}>AI Detection</p>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,212,168,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} style={{ color: C.acc }} />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>Active</p>
          <p style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>ML model running</p>
        </div>
      </div>

      {/* table */}
      <div>
        <SectionLabel>Flagged verifications</SectionLabel>
        <div style={{ ...C.card, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E8EDF5', borderTopColor: '#EF4444', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : !data?.results?.length ? (
            <div style={{ textAlign: 'center', padding: '64px 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Shield size={26} style={{ color: '#16A34A' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>No suspicious activity</p>
              <p style={{ fontSize: 13, color: C.mut, margin: 0 }}>The system is running clean. No flags to review.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {['Time', 'License Queried', 'Practitioner', 'Verified By', 'Result', 'IP Address'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mut }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #FEF2F2', background: 'rgba(254,242,242,0.4)' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(254,242,242,0.8)'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'rgba(254,242,242,0.4)'}>
                      <td style={{ padding: '11px 20px', fontSize: 11, color: C.mut, whiteSpace: 'nowrap' }}>{fmt(e.timestamp)}</td>
                      <td style={{ padding: '11px 20px', fontSize: 11, fontFamily: 'monospace', color: C.sub }}>{e.queried_credential_id}</td>
                      <td style={{ padding: '11px 20px', fontSize: 13, color: C.sub }}>{e.practitioner_name || '—'}</td>
                      <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: C.text }}>{e.verified_by}</td>
                      <td style={{ padding: '11px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#B91C1C' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                          {e.result}
                        </span>
                      </td>
                      <td style={{ padding: '11px 20px', fontSize: 11, fontFamily: 'monospace', color: C.mut }}>{e.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(data?.count ?? 0) > 20 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 12, color: C.mut }}>Page {page} of {Math.ceil(data.count / 20)}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Previous', page === 1, () => setPage(p => p - 1)], ['Next', page >= Math.ceil(data.count / 20), () => setPage(p => p + 1)]].map(([lbl, dis, fn]) => (
                  <button key={lbl} disabled={dis} onClick={fn} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: dis ? 'not-allowed' : 'pointer',
                    border: '1px solid #E8EDF5', background: '#fff', color: C.sub, opacity: dis ? 0.4 : 1,
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
