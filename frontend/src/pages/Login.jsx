import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login, twoFactorVerify } from '../api/auth'
import {
  ShieldCheck, Eye, EyeOff, Shield, Award, ScanSearch,
  CheckCircle2, ChevronRight, Smartphone, ArrowLeft,
} from 'lucide-react'
import useDocumentTitle from '../hooks/useDocumentTitle'

const BG   = '#060D1F'
const CARD = '#0B1527'
const BDR  = '#162236'
const ACC  = '#00D4A8'
const INP  = '#0F1E32'

const ROLES = [
  {
    id: 'ADMIN',
    icon: Shield,
    label: 'Administrator',
    tagline: 'Full platform control',
    color: '#A78BFA',
    glow: 'rgba(139,92,246,0.18)',
    border: 'rgba(139,92,246,0.35)',
    activeBg: 'rgba(139,92,246,0.08)',
    perks: [
      'Approve & manage user accounts',
      'Revoke or review all credentials',
      'Manage registered institutions',
      'Monitor AI fraud detection',
      'Full audit log access',
    ],
  },
  {
    id: 'ISSUER',
    icon: Award,
    label: 'Credential Issuer',
    tagline: 'Issue verified credentials',
    color: '#60A5FA',
    glow: 'rgba(59,130,246,0.18)',
    border: 'rgba(59,130,246,0.35)',
    activeBg: 'rgba(59,130,246,0.08)',
    perks: [
      'Issue practitioner credentials',
      'Record on Ethereum blockchain',
      'Upload documents to IPFS',
      'Send SMS & email notifications',
      'Track credential renewals',
    ],
  },
  {
    id: 'VERIFIER',
    icon: ScanSearch,
    label: 'Credential Verifier',
    tagline: 'Verify practitioner identity',
    color: '#00D4A8',
    glow: 'rgba(0,212,168,0.18)',
    border: 'rgba(0,212,168,0.35)',
    activeBg: 'rgba(0,212,168,0.06)',
    perks: [
      'Real-time license number lookup',
      'Face biometric verification',
      'Live blockchain proof check',
      'DeepFace anti-spoofing',
      'Instant fraud risk scoring',
    ],
  },
]

// ── OTP input — 6 individual digit boxes ─────────────────────────────────────
function OtpInput({ onComplete, loading, accentColor }) {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const refs = useRef([])

  const handleChange = (idx, val) => {
    const clean = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = clean
    setDigits(next)
    if (clean && idx < 5) refs.current[idx + 1]?.focus()
    if (next.every(Boolean)) onComplete(next.join(''))
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits]; next[idx] = ''; setDigits(next)
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus()
        const next = [...digits]; next[idx - 1] = ''; setDigits(next)
      }
    }
  }

  const handlePaste = e => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = Array(6).fill('')
    text.split('').forEach((d, i) => { next[i] = d })
    setDigits(next)
    const focusIdx = Math.min(text.length, 5)
    refs.current[focusIdx]?.focus()
    if (text.length === 6) onComplete(text)
  }

  useEffect(() => { refs.current[0]?.focus() }, [])

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={loading}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 48, height: 56, textAlign: 'center', fontSize: 22,
            fontWeight: 700, borderRadius: 12, outline: 'none',
            background: d ? `${accentColor}12` : INP,
            border: `1.5px solid ${d ? accentColor : BDR}`,
            color: d ? accentColor : '#fff',
            transition: 'all 0.15s', caretColor: 'transparent',
            opacity: loading ? 0.5 : 1,
          }}
          onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.boxShadow = `0 0 0 3px ${accentColor}22` }}
          onBlur={e => { e.target.style.borderColor = d ? accentColor : BDR; e.target.style.boxShadow = 'none' }}
        />
      ))}
    </div>
  )
}

// ── Role card ─────────────────────────────────────────────────────────────────
function RoleCard({ role, active, onClick }) {
  const Icon = role.icon
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: active ? role.activeBg : 'rgba(255,255,255,0.02)',
      border: `1px solid ${active ? role.border : BDR}`,
      borderRadius: 14, padding: '14px 16px', transition: 'all 0.2s',
      boxShadow: active ? `0 0 0 1px ${role.border}, 0 4px 20px ${role.glow}` : 'none',
      position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = role.border }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = BDR }}>
      {active && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: role.color, borderRadius: '3px 0 0 3px' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: active ? `${role.color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${active ? role.border : 'rgba(255,255,255,0.06)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
        }}>
          <Icon size={16} style={{ color: active ? role.color : '#475569' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: active ? '#F1F5F9' : '#94A3B8', margin: 0, lineHeight: 1.2 }}>
              {role.label}
            </p>
            {active && (
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 20, background: `${role.color}22`, color: role.color, textTransform: 'uppercase' }}>
                Selected
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: active ? role.color : '#334155', marginTop: 2, fontWeight: 600 }}>
            {role.tagline}
          </p>
          {active && (
            <ul style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 0, listStyle: 'none' }}>
              {role.perks.map(p => (
                <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <CheckCircle2 size={11} style={{ color: role.color, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ChevronRight size={14} style={{ color: active ? role.color : '#1E3A5F', flexShrink: 0, marginTop: 2, transform: active ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Login() {
  useDocumentTitle('Sign In')
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [step, setStep]               = useState('credentials') // 'credentials' | 'totp'
  const [form, setForm]               = useState({ username: '', password: '' })
  const [partialToken, setPartialToken] = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [showPw, setShowPw]           = useState(false)
  const [activeRole, setActiveRole]   = useState('VERIFIER')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCodeInput, setBackupCodeInput] = useState('')

  const role = ROLES.find(r => r.id === activeRole) ?? ROLES[2]

  // ── Step 1: username + password ───────────────────────────────────────────
  const handleCredentials = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await login(form.username, form.password)

      if (data.requires_2fa) {
        setPartialToken(data.partial_token)
        setStep('totp')
      } else if (data.requires_2fa_setup) {
        // First login — must set up 2FA before accessing the app
        navigate('/2fa/setup', { state: { partial_token: data.partial_token } })
      }
    } catch (err) {
      const detail  = err.response?.data?.detail || 'Login failed. Please try again.'
      const pending = err.response?.data?.pending
      const locked  = err.response?.data?.locked
      if (pending) navigate('/pending')
      else if (locked) setError(detail)
      else setError(detail)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: TOTP code or backup code ─────────────────────────────────────
  const handleTotp = async code => {
    setError('')
    setLoading(true)
    try {
      const { data } = await twoFactorVerify(partialToken, code)
      // Backend sets HttpOnly cookie; we only receive user payload
      signIn(null, data.user)
      navigate('/dashboard')
    } catch (err) {
      const detail  = err.response?.data?.detail || 'Verification failed.'
      const expired = err.response?.data?.expired
      if (expired) { setStep('credentials'); setError('Session expired — please sign in again.') }
      else setError(detail)
      setLoading(false)
    }
  }

  const handleBackupCode = async e => {
    e.preventDefault()
    if (!backupCodeInput.trim()) return
    await handleTotp(backupCodeInput.trim())
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    background: INP, border: `1px solid ${BDR}`, color: '#fff',
    fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    transition: 'border-color .15s', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: BG, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px 16px',
    }}>
      <div className="fixed inset-0 pointer-events-none grid-bg opacity-50" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 55% at 30% 0%, ${role.glow} 0%, transparent 65%)` }} />

      <div style={{
        position: 'relative', zIndex: 10, width: '100%', maxWidth: 880,
        display: 'grid',
        gridTemplateColumns: step === 'credentials' ? 'minmax(0,1fr) minmax(0,420px)' : '1fr',
        gap: 24, alignItems: 'start',
      }}
        className="max-md:grid-cols-1">

        {/* ── LEFT: role cards (credentials step only) ───────────────────── */}
        {step === 'credentials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#00D4A8,#00A886)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,212,168,0.3)' }}>
                <ShieldCheck size={20} color="#060D1F" strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', margin: 0, letterSpacing: '-0.01em' }}>VerifyDoc Uganda</p>
                <p style={{ fontSize: 11, color: '#334155', margin: 0, fontWeight: 600, letterSpacing: '0.04em' }}>BLOCKCHAIN MEDICAL CREDENTIALS</p>
              </div>
            </Link>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Who are you signing in as?</h2>
              <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>Select your role to see what you can do on the platform.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLES.map(r => (
                <RoleCard key={r.id} role={r} active={activeRole === r.id} onClick={() => setActiveRole(r.id)} />
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#1E3A5F', marginTop: 4 }}>
              All actions are recorded on the Ethereum Sepolia blockchain and logged in the audit trail.
            </p>
          </div>
        )}

        {/* ── RIGHT / CENTER: form area ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: step === 'totp' ? 420 : undefined, margin: step === 'totp' ? '0 auto' : undefined, width: '100%' }}>

          {step === 'credentials' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 20, background: `${role.color}14`, border: `1px solid ${role.border}` }}>
                <role.icon size={12} style={{ color: role.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: role.color, letterSpacing: '0.04em' }}>{role.label.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* ── Credentials form ── */}
          {step === 'credentials' && (
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 20, padding: '28px 24px', boxShadow: `0 0 0 1px ${BDR}, 0 8px 32px rgba(0,0,0,0.3)` }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#F1F5F9', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Welcome back</h1>
              <p style={{ fontSize: 13, color: '#334155', marginBottom: 24 }}>Sign in to your VerifyDoc account</p>

              {error && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 12, fontSize: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 8 }}>Username</label>
                  <input type="text" required value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="your_username" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = role.color}
                    onBlur={e => e.target.style.borderColor = BDR} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>Password</label>
                    <Link to="/forgot-password" style={{ fontSize: 11, color: '#334155', textDecoration: 'none', fontWeight: 600 }}
                      onMouseEnter={e => e.target.style.color = role.color}
                      onMouseLeave={e => e.target.style.color = '#334155'}>
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} required value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }}
                      onFocus={e => e.target.style.borderColor = role.color}
                      onBlur={e => e.target.style.borderColor = BDR} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: 4 }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: 13, borderRadius: 40, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? '#1A2744' : role.color,
                  color: loading ? '#475569' : '#060D1F',
                  fontSize: 14, fontWeight: 700, transition: 'all 0.2s', marginTop: 4,
                  boxShadow: loading ? 'none' : `0 4px 16px ${role.glow}`,
                }}>
                  {loading ? 'Signing in…' : `Sign in as ${role.label}`}
                </button>
              </form>
            </div>
          )}

          {/* ── TOTP verification step ── */}
          {step === 'totp' && (
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 20, padding: '32px 28px', boxShadow: `0 0 0 1px ${BDR}, 0 8px 32px rgba(0,0,0,0.3)` }}>
              {/* icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: `${role.color}15`, border: `1px solid ${role.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 24px ${role.glow}`,
                }}>
                  <Smartphone size={24} style={{ color: role.color }} />
                </div>
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F1F5F9', textAlign: 'center', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Two-factor verification
              </h2>
              <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 28, lineHeight: 1.55 }}>
                Open your authenticator app and enter the<br />6-digit code for <span style={{ color: '#94A3B8', fontWeight: 600 }}>VerifyDoc Uganda</span>
              </p>

              {error && (
                <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 12, fontSize: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {!useBackupCode ? (
                <>
                  <OtpInput onComplete={handleTotp} loading={loading} accentColor={role.color} />

                  {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${BDR}`, borderTopColor: role.color, animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  )}

                  <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div style={{ height: 1, flex: 1, background: BDR }} />
                    <span style={{ fontSize: 11, color: '#1E3A5F', padding: '0 8px' }}>Code refreshes every 30 seconds</span>
                    <div style={{ height: 1, flex: 1, background: BDR }} />
                  </div>

                  <button type="button"
                    onClick={() => { setUseBackupCode(true); setError('') }}
                    style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontSize: 12, fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#64748B'}
                    onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
                    Lost your phone? Use a backup code
                  </button>
                </>
              ) : (
                /* ── Backup code input ── */
                <form onSubmit={handleBackupCode}>
                  <p style={{ fontSize: 12, color: '#475569', marginBottom: 10, textAlign: 'center' }}>
                    Enter one of your 8-character backup codes (e.g. ABCD-1234)
                  </p>
                  <input
                    type="text"
                    value={backupCodeInput}
                    onChange={e => setBackupCodeInput(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12,
                      background: INP, border: `1px solid ${BDR}`, color: '#fff',
                      fontSize: 16, fontWeight: 700, letterSpacing: '0.1em',
                      textAlign: 'center', boxSizing: 'border-box', fontFamily: 'monospace',
                    }}
                    onFocus={e => e.target.style.borderColor = role.color}
                    onBlur={e => e.target.style.borderColor = BDR}
                  />
                  <button type="submit" disabled={loading || backupCodeInput.length < 8}
                    style={{
                      width: '100%', marginTop: 12, padding: '12px', borderRadius: 40, border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading ? '#1A2744' : role.color,
                      color: '#060D1F', fontSize: 14, fontWeight: 700,
                    }}>
                    {loading ? 'Verifying…' : 'Use Backup Code'}
                  </button>
                  <button type="button"
                    onClick={() => { setUseBackupCode(false); setBackupCodeInput(''); setError('') }}
                    style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontSize: 12, fontWeight: 600 }}>
                    ← Back to authenticator app
                  </button>
                </form>
              )}

              <button type="button" onClick={() => { setStep('credentials'); setUseBackupCode(false); setError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '16px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8 }}
                onMouseEnter={e => e.currentTarget.style.color = '#64748B'}
                onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </div>
          )}

          {step === 'credentials' && (
            <>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#334155' }}>
                No account?{' '}
                <Link to="/register" style={{ fontWeight: 700, color: role.color, textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                  Create one
                </Link>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Blockchain', value: 'Sepolia',   sub: 'Ethereum testnet' },
                  { label: 'Storage',    value: 'IPFS',      sub: 'Pinata gateway' },
                  { label: 'Biometrics', value: 'DeepFace',  sub: 'AI face match' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BDR}`, borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748B', margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: '#1E3A5F', margin: '2px 0 0', fontWeight: 600 }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .max-md\\:grid-cols-1 { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
