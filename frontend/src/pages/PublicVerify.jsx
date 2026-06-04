import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search, CheckCircle, XCircle, AlertTriangle, ExternalLink,
  ShieldCheck, Building2, GraduationCap, Calendar, RefreshCw,
  User, Blocks, Clock, BadgeCheck, Hash, Copy, Check,
} from 'lucide-react'
import { publicVerify } from '../api/credentials'
import useDocumentTitle from '../hooks/useDocumentTitle'

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const T = {
  bg:     '#060D1F',
  card:   '#0B1527',
  card2:  '#0D1930',
  border: '#1A2E4A',
  acc:    '#00D4A8',
  blue:   '#4A9EFF',
  green:  '#22C55E',
  red:    '#EF4444',
  amber:  '#F59E0B',
  text:   '#F1F5F9',
  sub:    '#94A3B8',
  dim:    '#475569',
}

const STEPS = [
  { label: 'Searching credential database',    icon: Search  },
  { label: 'Verifying on-chain record',        icon: Blocks  },
  { label: 'Fetching practitioner profile',    icon: User    },
]

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86_400_000)
}

function ExpiryChip({ days }) {
  if (days === null) return null
  const expired = days <= 0
  const soon    = days > 0 && days <= 90
  const [bg, clr, lbl] = expired
    ? ['rgba(239,68,68,0.15)',   '#FCA5A5', `Expired ${Math.abs(days)}d ago`]
    : soon
    ? ['rgba(245,158,11,0.15)',  '#FCD34D', `Expires in ${days}d`]
    : ['rgba(34,197,94,0.15)',   '#86EFAC', `Valid · ${days}d left`]
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ background: bg, color: clr }}>
      <Clock size={9} />{lbl}
    </span>
  )
}

function PhotoFrame({ photoUrl, name, isValid, photoError, setPhotoError }) {
  const initials = name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  const ring  = isValid ? T.green : T.red
  const glow  = isValid ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'
  return (
    <div className="relative" style={{ width: 88, height: 88 }}>
      <div className="w-22 h-22 rounded-2xl overflow-hidden"
        style={{
          width: 88, height: 88,
          border: `3px solid ${ring}`,
          boxShadow: `0 0 24px ${glow}`,
        }}>
        {photoUrl && !photoError
          ? <img src={photoUrl} alt={name} className="w-full h-full object-cover"
              onError={() => setPhotoError(true)} />
          : <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold"
              style={{ background: 'rgba(0,212,168,0.08)', color: T.acc }}>
              {initials}
            </div>
        }
      </div>
      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: ring, border: `2px solid ${T.card}` }}>
        {isValid
          ? <CheckCircle size={13} color={T.bg} strokeWidth={3} />
          : <XCircle size={13} color={T.bg} strokeWidth={3} />}
      </div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button type="button" onClick={handleCopy}
      className="flex-shrink-0 p-1 rounded transition-opacity hover:opacity-70"
      title="Copy to clipboard">
      {copied
        ? <Check size={12} style={{ color: T.acc }} />
        : <Copy size={12} style={{ color: T.dim }} />}
    </button>
  )
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function PublicVerify() {
  useDocumentTitle('Verify Credential')
  const [searchParams] = useSearchParams()
  const [query, setQuery]         = useState(searchParams.get('q') || '')
  const [phase, setPhase]         = useState('idle') // idle | loading | done | error
  const [stepsDone, setStepsDone] = useState([false, false, false])
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [photoError, setPhotoError] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) doSearch(q)
  }, [])

  const doSearch = async raw => {
    const license = raw.trim().toUpperCase()
    if (!license) return
    setError(''); setResult(null); setPhotoError(false)
    setPhase('loading'); setStepsDone([false, false, false])

    const tick = (i, ms) => setTimeout(() => setStepsDone(s => s.map((v, j) => j <= i ? true : v)), ms)
    tick(0, 300); tick(1, 700); tick(2, 1100)

    try {
      const { data } = await publicVerify(license)
      setTimeout(() => { setResult(data); setPhase('done') }, 1350)
    } catch (err) {
      setTimeout(() => {
        setError(err.response?.status === 404
          ? 'No credential found with this license number.'
          : 'Verification service unavailable. Please try again.')
        setPhase('error')
      }, 800)
    }
  }

  const handleSubmit = e => { e.preventDefault(); doSearch(query) }
  const reset = () => { setPhase('idle'); setResult(null); setError(''); setQuery('') }

  const isValid = result?.status === 'ACTIVE' && result?.blockchain_active !== false
  const days    = daysUntil(result?.license_expiry_date)

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: T.bg, color: T.text }}>

        {/* dot-grid background */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(${T.border} 1px, transparent 1px)`,
          backgroundSize: '28px 28px', opacity: 0.55,
        }} />

        {/* nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 h-14 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: T.acc }}>
              <ShieldCheck size={14} color={T.bg} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-sm tracking-tight" style={{ color: T.text }}>VerifyDoc</span>
            <span className="text-xs font-bold" style={{ color: T.acc }}>Uganda</span>
          </Link>
          <Link to="/login"
            className="px-4 py-2 rounded-full text-xs font-bold transition-all hover:opacity-90"
            style={{ background: T.acc, color: T.bg }}>
            Sign in
          </Link>
        </nav>

        {/* page body */}
        <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-10 md:py-14">

          {/* hero — hidden once result is visible */}
          {phase !== 'done' && (
            <div className="text-center mb-8 max-w-xl">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                style={{ background: 'rgba(0,212,168,0.1)', border: `1px solid rgba(0,212,168,0.18)` }}>
                <BadgeCheck size={26} style={{ color: T.acc }} />
              </div>
              <h1 className="text-3xl md:text-[2.6rem] font-extrabold tracking-tight leading-tight mb-3">
                Verify a Medical Professional
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: T.sub }}>
                Instantly check whether a practitioner's medical credential is valid,
                active, and permanently recorded on the blockchain.
              </p>
            </div>
          )}

          {/* search bar */}
          <form onSubmit={handleSubmit}
            className="w-full mb-6 transition-all duration-500"
            style={{ maxWidth: phase === 'done' ? '52rem' : '36rem' }}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: T.dim }} />
                <input
                  type="text" value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Enter license number — e.g. UMDPC/2024/12345"
                  disabled={phase === 'loading'}
                  className="w-full text-sm pl-11 pr-4 py-3.5 rounded-2xl outline-none transition-all duration-200"
                  style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
                  onFocus={e => {
                    e.target.style.borderColor = T.acc
                    e.target.style.boxShadow = `0 0 0 3px rgba(0,212,168,0.1)`
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = T.border
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <button type="submit" disabled={!query.trim() || phase === 'loading'}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold flex-shrink-0 disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: T.acc, color: T.bg }}>
                {phase === 'loading'
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Search size={15} />}
                {phase === 'loading' ? 'Checking…' : 'Verify'}
              </button>
            </div>
          </form>

          {/* ── Loading steps ── */}
          {phase === 'loading' && (
            <div className="w-full space-y-2" style={{ maxWidth: '36rem' }}>
              {STEPS.map(({ label, icon: Icon }, i) => {
                const done    = stepsDone[i]
                const active  = !done && i === stepsDone.filter(Boolean).length
                return (
                  <div key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: done ? 'rgba(0,212,168,0.07)' : T.card,
                      border: `1px solid ${done ? 'rgba(0,212,168,0.18)' : T.border}`,
                      opacity: i > stepsDone.filter(Boolean).length ? 0.35 : 1,
                      transition: 'all 0.35s ease',
                      animation: 'stepIn 0.3s ease both',
                      animationDelay: `${i * 80}ms`,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: done ? 'rgba(0,212,168,0.15)' : 'rgba(255,255,255,0.04)' }}>
                      {done
                        ? <CheckCircle size={15} style={{ color: T.acc }} />
                        : active
                        ? <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                            style={{ borderColor: T.border, borderTopColor: T.acc }} />
                        : <Icon size={13} style={{ color: T.dim }} />}
                    </div>
                    <span className="text-sm font-medium" style={{ color: done ? T.acc : T.sub }}>
                      {label}
                    </span>
                    {done && (
                      <CheckCircle size={13} className="ml-auto" style={{ color: T.acc }} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <div className="w-full flex items-start gap-3 px-5 py-4 rounded-2xl"
              style={{
                maxWidth: '36rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
              <XCircle size={20} style={{ color: T.red }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm" style={{ color: '#FCA5A5' }}>{error}</p>
                <p className="text-xs mt-0.5" style={{ color: T.dim }}>
                  Expected format:{' '}
                  <span style={{ color: T.sub, fontFamily: 'monospace' }}>UMDPC/YYYY/NNNNN</span>
                </p>
              </div>
            </div>
          )}

          {/* ── Result ── */}
          {phase === 'done' && result && (
            <div className="w-full" style={{ maxWidth: '52rem', animation: 'fadeUp 0.45s ease both' }}>

              {/* status banner */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 rounded-2xl mb-4"
                style={isValid
                  ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)' }
                  : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
                {isValid
                  ? <CheckCircle size={20} style={{ color: T.green }} />
                  : <XCircle size={20} style={{ color: T.red }} />}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm" style={{ color: isValid ? '#86EFAC' : '#FCA5A5' }}>
                    {isValid ? 'Credential Verified — Valid & Active' : `Credential is ${result.status}`}
                  </p>
                  <p className="text-xs" style={{ color: isValid ? '#4ADE80' : '#F87171' }}>
                    {isValid
                      ? 'Valid, currently active, and blockchain-verified.'
                      : 'This credential is not currently active. Do not accept it.'}
                  </p>
                  {result.status === 'REVOKED' && result.revocation_reason && (
                    <p className="text-xs mt-1 font-medium" style={{ color: '#FCA5A5' }}>
                      Reason: {result.revocation_reason}
                    </p>
                  )}
                </div>
                <ExpiryChip days={days} />
                <button onClick={reset} title="Search again"
                  className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                  style={{ color: T.dim }}>
                  <RefreshCw size={15} />
                </button>
              </div>

              <div className="grid md:grid-cols-5 gap-4">

                {/* ── Left: identity ── */}
                <div className="md:col-span-2 rounded-2xl p-5 flex flex-col gap-4"
                  style={{ background: T.card, border: `1px solid ${T.border}` }}>

                  <PhotoFrame
                    photoUrl={result.photo_url}
                    name={result.practitioner_name}
                    isValid={isValid}
                    photoError={photoError}
                    setPhotoError={setPhotoError}
                  />

                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight leading-tight" style={{ color: T.text }}>
                      {result.practitioner_name}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: T.sub }}>
                      {result.qualification}
                      {result.specialization ? (
                        <span style={{ color: T.dim }}> · {result.specialization}</span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                      style={isValid
                        ? { background: 'rgba(34,197,94,0.12)', color: '#86EFAC' }
                        : { background: 'rgba(239,68,68,0.12)', color: '#FCA5A5' }}>
                      <span className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isValid ? T.green : T.red }} />
                      {result.status}
                    </span>
                    {result.blockchain_verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: 'rgba(0,212,168,0.1)', color: T.acc }}>
                        <ShieldCheck size={9} />On-chain
                      </span>
                    )}
                  </div>

                  {result.institution_of_study && (
                    <div className="flex items-start gap-2 pt-1"
                      style={{ borderTop: `1px solid ${T.border}` }}>
                      <Building2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: T.dim }} />
                      <p className="text-xs leading-snug" style={{ color: T.sub }}>
                        {result.institution_of_study}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Right: details + blockchain ── */}
                <div className="md:col-span-3 flex flex-col gap-4">

                  {/* credential details */}
                  <div className="rounded-2xl p-5 flex-1"
                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4"
                      style={{ color: T.dim }}>Credential Details</p>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                      {[
                        { icon: Hash,          label: 'License Number',     value: result.license_number,       mono: true  },
                        { icon: Calendar,      label: 'Expiry Date',        value: result.license_expiry_date              },
                        { icon: GraduationCap, label: 'Graduation Year',    value: result.year_of_graduation               },
                        { icon: Building2,     label: 'Institution',        value: result.institution_of_study             },
                      ].filter(f => f.value).map(({ icon: Icon, label, value, mono }) => (
                        <div key={label} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}` }}>
                            <Icon size={11} style={{ color: T.dim }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: T.dim }}>
                              {label}
                            </p>
                            <p className={`text-sm font-semibold mt-0.5 truncate ${mono ? '' : ''}`}
                              style={{ color: T.text, fontFamily: mono ? 'monospace' : undefined }}>
                              {value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* blockchain proof */}
                  <div className="rounded-2xl p-5"
                    style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3"
                      style={{ color: T.dim }}>Blockchain Proof</p>

                    {result.blockchain_tx_hash ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} style={{ color: T.acc }} />
                          <span className="text-xs font-bold" style={{ color: T.acc }}>
                            Verified on Ethereum Sepolia
                          </span>
                        </div>

                        <div className="rounded-xl px-3 py-2.5"
                          style={{ background: T.card2, border: `1px solid ${T.border}` }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.dim }}>
                              Transaction Hash
                            </p>
                            <CopyButton text={result.blockchain_tx_hash} />
                          </div>
                          <p className="text-[11px] font-mono break-all leading-relaxed" style={{ color: T.sub }}>
                            {result.blockchain_tx_hash}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          {result.blockchain_recorded_at && (
                            <p className="text-xs" style={{ color: T.dim }}>
                              Recorded {new Date(result.blockchain_recorded_at).toLocaleDateString('en-UG', { dateStyle: 'medium' })}
                            </p>
                          )}
                          <a href={`https://sepolia.etherscan.io/tx/${result.blockchain_tx_hash}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline ml-auto"
                            style={{ color: T.blue }}>
                            View on Etherscan <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs" style={{ color: T.dim }}>
                        <AlertTriangle size={14} style={{ color: T.amber }} />
                        Not yet recorded on blockchain
                      </div>
                    )}

                    {result.blockchain_active === false && (
                      <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: T.amber }} />
                        <span style={{ color: '#FCD34D' }}>
                          On-chain status does not match the database record. Treat this credential with caution.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Trust signals (idle & error) ── */}
          {(phase === 'idle' || phase === 'error') && (
            <div className="flex flex-wrap justify-center gap-5 mt-10">
              {[
                { icon: ShieldCheck,  title: 'Blockchain Verified',   sub: 'On Ethereum Sepolia'   },
                { icon: BadgeCheck,   title: 'UMDPC Registered',      sub: 'Government approved'   },
                { icon: Clock,        title: 'Instant Results',        sub: 'Real-time lookup'      },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0,212,168,0.07)', border: `1px solid rgba(0,212,168,0.12)` }}>
                    <Icon size={15} style={{ color: T.acc }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: T.text }}>{title}</p>
                    <p className="text-[11px]" style={{ color: T.dim }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* footer */}
        <footer className="relative z-10 py-5 px-6 text-center text-xs"
          style={{ color: T.dim, borderTop: `1px solid ${T.border}` }}>
          VerifyDoc Uganda — Blockchain Medical Credential Verification ·{' '}
          <Link to="/" className="hover:underline" style={{ color: T.sub }}>Home</Link>{' '}·{' '}
          <Link to="/login" className="hover:underline" style={{ color: T.sub }}>Sign in</Link>
        </footer>
      </div>
    </>
  )
}
