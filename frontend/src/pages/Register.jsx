import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { ShieldCheck, Building2, ChevronDown, Eye, EyeOff } from 'lucide-react'
import client from '../api/client'
import useDocumentTitle from '../hooks/useDocumentTitle'

const BG   = '#060D1F'
const CARD = '#0B1527'
const BDR  = '#162236'
const ACC  = '#00D4A8'
const INP  = '#0F1E32'

const TYPE_LABELS = {
  UNIVERSITY:     'Medical University',
  HOSPITAL:       'Hospital',
  CLINIC:         'Clinic',
  LICENSING_BODY: 'Licensing Body',
}

const ROLES = [
  { value: 'VERIFIER', label: 'Verifier — Hospital / Clinic' },
  { value: 'ISSUER',   label: 'Issuer — Medical School / Licensing Body' },
]

const labelCls = 'block text-[11px] font-bold uppercase tracking-[0.1em] mb-1.5'

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '12px',
  background: INP, border: `1px solid ${BDR}`,
  color: '#fff', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
}

/* ── Password strength ──────────────────────────────────────────────────────── */
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', colour: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',      colour: '#F87171' }
  if (score <= 2) return { score, label: 'Fair',      colour: '#FCD34D' }
  if (score <= 3) return { score, label: 'Good',      colour: '#60A5FA' }
  return           { score, label: 'Strong', colour: ACC }
}

function PasswordStrengthBar({ password }) {
  const { score, label, colour } = passwordStrength(password)
  if (!password) return null
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colour : BDR,
            transition: 'background 0.25s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: colour, fontWeight: 600, margin: 0 }}>{label}</p>
    </div>
  )
}

/* ── Field ────────────────────────────────────────────────────────────────── */
function Field({ label, type = 'text', placeholder = '', value, onChange, onBlur, error, hint }) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label className={labelCls} style={{ color: '#64748B' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && showPw ? 'text' : type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: isPassword ? 44 : 14 }}
          onFocus={e => e.target.style.borderColor = ACC}
          onBlur_={(e) => { e.target.style.borderColor = error ? '#F87171' : BDR; onBlur && onBlur(e) }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPw(v => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: 4 }}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 11, color: '#fca5a5', margin: '4px 0 0' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: '#475569', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

export default function Register() {
  useDocumentTitle('Create Account')
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    role: 'VERIFIER', institution_id: '', phone_number: '',
  })
  const [institutions, setInstitutions] = useState([])
  const [instLoading, setInstLoading]   = useState(true)
  const [errors, setErrors]             = useState({})
  const [touched, setTouched]           = useState({})
  const [loading, setLoading]           = useState(false)

  useEffect(() => {
    client.get('/institutions/')
      .then(r => setInstitutions(r.data))
      .catch(() => setInstitutions([]))
      .finally(() => setInstLoading(false))
  }, [])

  const set = f => e => setForm(v => ({ ...v, [f]: e.target.value }))
  const touch = f => () => setTouched(v => ({ ...v, [f]: true }))

  // Real-time inline validation (runs when field is touched)
  const validateField = (field, value) => {
    if (field === 'username' && value && value.length < 3) return 'At least 3 characters'
    if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email'
    if (field === 'password' && value && value.length < 8) return 'At least 8 characters'
    if (field === 'confirmPassword' && value && value !== form.password) return 'Passwords do not match'
    if (field === 'phone_number' && value && !/^\+?[0-9\s\-]{7,15}$/.test(value)) return 'Enter a valid phone number'
    return ''
  }

  const inlineErrors = {}
  Object.keys(touched).forEach(f => {
    const err = validateField(f, form[f])
    if (err) inlineErrors[f] = err
  })
  const displayErrors = { ...inlineErrors, ...errors }

  const handleSubmit = async e => {
    e.preventDefault()
    setErrors({})

    if (!form.institution_id) {
      setErrors({ institution_id: 'Please select an institution.' })
      return
    }
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    try {
      await register({
        username:       form.username,
        email:          form.email,
        password:       form.password,
        role:           form.role,
        institution_id: form.institution_id,
        phone_number:   form.phone_number,
      })
      navigate('/pending')
    } catch (err) {
      setErrors(err.response?.data || { detail: 'Registration failed.' })
    } finally {
      setLoading(false)
    }
  }

  const selectedInst = institutions.find(i => String(i.id) === String(form.institution_id))
  const strength = passwordStrength(form.password)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: BG, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none grid-bg opacity-60" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${ACC}0a 0%, transparent 70%)` }} />

      {/* Skip to content */}
      <a href="#register-form" style={{
        position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden',
        ':focus': { left: 16, top: 16, width: 'auto', height: 'auto' }
      }}>Skip to form</a>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: ACC }}>
              <ShieldCheck size={22} color={BG} strokeWidth={2.5} />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create an Account</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>Your account will be reviewed by an administrator</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BDR}` }}>
          {displayErrors.detail && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              {displayErrors.detail}
            </div>
          )}
          <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username" placeholder="choose_username"
                value={form.username} onChange={set('username')} onBlur={touch('username')} error={displayErrors.username} />
              <Field label="Email" type="email" placeholder="you@hospital.ug"
                value={form.email} onChange={set('email')} onBlur={touch('email')} error={displayErrors.email} />
            </div>

            <div>
              <Field label="Password" type="password" placeholder="Min 8 characters"
                value={form.password} onChange={set('password')} onBlur={touch('password')} error={displayErrors.password} />
              <PasswordStrengthBar password={form.password} />
            </div>

            <Field label="Confirm Password" type="password" placeholder="Re-enter password"
              value={form.confirmPassword} onChange={set('confirmPassword')} onBlur={touch('confirmPassword')}
              error={displayErrors.confirmPassword}
              hint={form.confirmPassword && form.confirmPassword === form.password ? '✓ Passwords match' : ''} />

            {/* Institution dropdown */}
            <div>
              <label className={labelCls} style={{ color: '#64748B' }}>Institution</label>
              {instLoading ? (
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #162236', borderTopColor: ACC, animation: 'spin 0.7s linear infinite' }} />
                  Loading institutions…
                </div>
              ) : institutions.length === 0 ? (
                <div style={{ ...inputStyle, color: '#F87171', fontSize: 13 }}>
                  No registered institutions yet. Contact the administrator.
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <select
                    value={form.institution_id}
                    onChange={set('institution_id')}
                    required
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: 36 }}
                    onFocus={e => e.target.style.borderColor = ACC}
                    onBlur={e => e.target.style.borderColor = BDR}>
                    <option value="" style={{ background: INP }}>— Select your institution —</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id} style={{ background: INP }}>
                        {inst.name} ({TYPE_LABELS[inst.institution_type] ?? inst.institution_type})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                </div>
              )}
              {selectedInst && (
                <div className="flex items-center gap-2 mt-1.5 px-2">
                  <Building2 size={11} style={{ color: ACC }} />
                  <span style={{ fontSize: 11, color: '#475569' }}>
                    {TYPE_LABELS[selectedInst.institution_type] ?? selectedInst.institution_type}
                  </span>
                </div>
              )}
              {displayErrors.institution_id && <p style={{ fontSize: 11, color: '#fca5a5', margin: '4px 0 0' }}>{displayErrors.institution_id}</p>}
            </div>

            <Field label="Phone" type="tel" placeholder="+256 700 000 000"
              value={form.phone_number} onChange={set('phone_number')} onBlur={touch('phone_number')} error={displayErrors.phone_number} />

            <div>
              <label className={labelCls} style={{ color: '#64748B' }}>Account Type</label>
              <select value={form.role} onChange={set('role')}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = ACC}
                onBlur={e => e.target.style.borderColor = BDR}>
                {ROLES.map(r => <option key={r.value} value={r.value} style={{ background: INP }}>{r.label}</option>)}
              </select>
            </div>

            <button type="submit" disabled={loading || instLoading || institutions.length === 0 || strength.score < 1}
              className="w-full py-3 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-50"
              style={{ background: ACC, color: BG }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: '#4A5568' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-bold hover:underline" style={{ color: ACC }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
