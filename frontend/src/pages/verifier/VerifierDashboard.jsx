import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, CheckCircle, XCircle, Activity, ShieldCheck, ScanFace, ChevronRight, ArrowRight } from 'lucide-react'
import StatCard from '../../components/StatCard'
import { TrendArea } from '../../components/MiniChart'
import { getStats } from '../../api/auth'
import { publicVerify } from '../../api/credentials'
import { useAuth } from '../../context/AuthContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const C = {
  get card() { return { background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', borderRadius: 16 } },
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

function QuickVerify() {
  const navigate  = useNavigate()
  const [q, setQ]           = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError]   = useState('')

  const handleSearch = async e => {
    e.preventDefault()
    if (!q.trim()) return
    setError(''); setResult(null); setLoading(true)
    try {
      const { data } = await publicVerify(q.trim().toUpperCase())
      setResult(data)
    } catch (err) {
      setError(err.response?.status === 404 ? 'No credential found.' : 'Lookup failed.')
    } finally { setLoading(false) }
  }

  const isValid = result?.status === 'ACTIVE' && result?.blockchain_active !== false

  return (
    <div style={{ ...C.card, padding: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Quick License Lookup</p>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.mut, pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="UMDPC/2024/12345"
            style={{
              width: '100%', padding: '9px 12px 9px 34px', fontSize: 13, outline: 'none',
              background: 'var(--app-input)', border: '1px solid var(--app-card-bdr)', borderRadius: 10,
              color: C.text, boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--clr-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--app-card-bdr)'} />
        </div>
        <button type="submit" disabled={!q.trim() || loading} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
          borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
          background: 'var(--clr-accent)', color: '#06101F', opacity: (!q.trim() || loading) ? 0.5 : 1,
        }}>
          {loading ? '…' : <><Search size={13} />Verify</>}
        </button>
      </form>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 8 }}>
          <XCircle size={14} style={{ color: '#F87171', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#F87171', margin: 0 }}>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${isValid ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, background: isValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {isValid
              ? <CheckCircle size={15} style={{ color: '#10B981' }} />
              : <XCircle size={15} style={{ color: '#F87171' }} />}
            <span style={{ fontSize: 12, fontWeight: 700, color: isValid ? '#10B981' : '#F87171' }}>
              {isValid ? 'Valid & Active' : `Credential ${result.status}`}
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{result.practitioner_name}</p>
          <p style={{ fontSize: 12, color: C.sub, margin: '2px 0 0' }}>{result.qualification}{result.specialization ? ` · ${result.specialization}` : ''}</p>
          <button onClick={() => navigate(`/verifier/verify?q=${encodeURIComponent(q.trim().toUpperCase())}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--clr-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', marginTop: 6 }}>
            Full details <ArrowRight size={11} />
          </button>
        </div>
      )}

      <Link to="/verifier/verify"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.sub, textDecoration: 'none', marginTop: 12, border: '1px dashed var(--app-card-bdr)', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--clr-accent)'; e.currentTarget.style.color = 'var(--clr-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-card-bdr)'; e.currentTarget.style.color = C.sub }}>
        Full Verification Page <ChevronRight size={13} />
      </Link>
    </div>
  )
}

export default function VerifierDashboard() {
  useDocumentTitle('Dashboard')
  const { user }  = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { getStats().then(r => setStats(r.data)).finally(() => setLoading(false)) }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--app-card-bdr)', borderTopColor: 'var(--clr-accent)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.mut, marginBottom: 4 }}>
            Verifier Portal
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
            Welcome back, {user?.username}
          </h1>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{user?.institution_name || 'Verifier Account'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/verifier/face-verify" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none',
            background: 'rgba(139,92,246,0.1)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <ScanFace size={14} />Face Verify
          </Link>
          <Link to="/verifier/verify" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none',
            background: 'var(--clr-accent)', color: '#06101F',
          }}>
            <Search size={14} />Verify Credential
          </Link>
        </div>
      </div>

      {/* stats */}
      <div>
        <SectionLabel>Your activity</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <StatCard title="Total Verifications" value={stats?.total_verifications}     icon={<Activity size={16}    />} colour="blue"  />
          <StatCard title="Successful"          value={stats?.successful_verifications} icon={<CheckCircle size={16} />} colour="green" />
          <StatCard title="Not Found"           value={stats?.failed_verifications}    icon={<XCircle size={16}     />} colour="red"   />
        </div>
      </div>

      {/* chart + quick verify */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16 }} className="max-md:grid-cols-1">
        <div style={{ ...C.card, padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mut, marginBottom: 16 }}>
            Your verifications — last 30 days
          </p>
          <TrendArea labels={stats?.chart_daily_labels} data={stats?.chart_daily_data} colour="teal" height={160} />
        </div>
        <QuickVerify />
      </div>

      {/* tools */}
      <div>
        <SectionLabel>Verification tools</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
          {[
            {
              to: '/verifier/verify',
              icon: ShieldCheck,
              title: 'License Verification',
              desc: 'Enter a UMDPC license number to verify status and blockchain record',
              colour: 'var(--clr-accent)', bg: 'rgba(0,212,168,0.07)', border: 'rgba(0,212,168,0.2)',
            },
            {
              to: '/verifier/face-verify',
              icon: ScanFace,
              title: 'Biometric Face Verify',
              desc: "Use your camera to match a practitioner's face against their registered photo",
              colour: '#A78BFA', bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.2)',
            },
          ].map(({ to, icon: Icon, title, desc, colour, bg, border }) => (
            <Link key={to} to={to} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, padding: 18,
              borderRadius: 14, textDecoration: 'none',
              background: 'var(--app-card)', border: '1px solid var(--app-card-bdr)', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = bg }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-card-bdr)'; e.currentTarget.style.background = 'var(--app-card)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color: colour }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{title}</p>
                <p style={{ fontSize: 12, color: C.sub, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .max-md\\:grid-cols-1 { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
