import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { confirmPasswordReset } from '../api/auth'
import useDocumentTitle from '../hooks/useDocumentTitle'

const BG   = '#060D1F'
const CARD = '#0B1527'
const BDR  = '#162236'
const ACC  = '#00D4A8'
const INP  = '#0F1E32'

function StrengthBar({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const colours = ['#EF4444', '#F59E0B', '#F59E0B', '#22C55E', '#00D4A8']
  const labels  = ['', 'Weak', 'Fair', 'Good', 'Strong']

  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-colors"
            style={{ background: i < score ? colours[score] : '#1E293B' }} />
        ))}
      </div>
      <p className="text-[11px] font-semibold" style={{ color: colours[score] }}>
        {labels[score]}
      </p>
    </div>
  )
}

export default function ResetPassword() {
  useDocumentTitle('Set New Password')
  const { uid, token } = useParams()
  const navigate       = useNavigate()

  const [form, setForm]     = useState({ new_password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState('')
  const [fieldError, setFieldError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setFieldError('')

    if (form.new_password !== form.confirm) {
      setFieldError('Passwords do not match.')
      return
    }
    if (form.new_password.length < 8) {
      setFieldError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset(uid, token, form.new_password)
      setDone(true)
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || data.new_password || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px',
    background: INP, border: `1px solid ${BDR}`,
    color: '#fff', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    transition: 'border-color .15s', boxSizing: 'border-box',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: BG, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      <div className="fixed inset-0 pointer-events-none grid-bg opacity-60" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${ACC}0a 0%, transparent 70%)` }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: ACC }}>
            <ShieldCheck size={22} color={BG} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Set new password</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Choose a strong password for your account
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BDR}` }}>
          {done ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto"
                style={{ background: 'rgba(0,212,168,0.1)', border: `1px solid rgba(0,212,168,0.2)` }}>
                <CheckCircle size={28} style={{ color: ACC }} />
              </div>
              <div>
                <p className="font-bold text-white mb-1">Password updated</p>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Your password has been reset successfully. You can now sign in.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-full font-bold text-sm transition-all hover:opacity-90"
                style={{ background: ACC, color: BG }}>
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <XCircle size={15} style={{ color: '#FCA5A5' }} className="flex-shrink-0 mt-0.5" />
                  <span style={{ color: '#fca5a5' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: '#64748B' }}>New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} required
                      value={form.new_password}
                      onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = ACC}
                      onBlur={e => e.target.style.borderColor = BDR}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#4A5568' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <StrengthBar password={form.new_password} />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: '#64748B' }}>Confirm password</label>
                  <input
                    type={showPw ? 'text' : 'password'} required
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat your password"
                    style={{ ...inputStyle, paddingLeft: '14px' }}
                    onFocus={e => e.target.style.borderColor = ACC}
                    onBlur={e => e.target.style.borderColor = BDR}
                  />
                  {fieldError && (
                    <p className="text-xs font-medium mt-1.5" style={{ color: '#FCA5A5' }}>{fieldError}</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !form.new_password || !form.confirm}
                  className="w-full py-3 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-50 mt-2"
                  style={{ background: ACC, color: BG }}>
                  {loading ? 'Saving…' : 'Reset password'}
                </button>
              </form>
            </>
          )}
        </div>

        {!done && (
          <div className="text-center mt-4">
            <Link to="/forgot-password"
              className="text-sm transition-colors hover:text-white"
              style={{ color: '#4A5568' }}>
              Request a new link instead
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
