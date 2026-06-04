import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { requestPasswordReset } from '../api/auth'
import useDocumentTitle from '../hooks/useDocumentTitle'

const BG   = '#060D1F'
const CARD = '#0B1527'
const BDR  = '#162236'
const ACC  = '#00D4A8'
const INP  = '#0F1E32'

export default function ForgotPassword() {
  useDocumentTitle('Reset Password')
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.email || err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px',
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Forgot password?</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Enter your email and we'll send a reset link
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BDR}` }}>
          {sent ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto"
                style={{ background: 'rgba(0,212,168,0.1)', border: `1px solid rgba(0,212,168,0.2)` }}>
                <CheckCircle size={28} style={{ color: ACC }} />
              </div>
              <div>
                <p className="font-bold text-white mb-1">Check your inbox</p>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  If <span className="font-semibold" style={{ color: '#94A3B8' }}>{email}</span> is
                  registered, you'll receive a reset link within a few minutes.
                </p>
              </div>
              <p className="text-xs" style={{ color: '#475569' }}>
                Don't see it? Check your spam folder.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: ACC }}>
                Try a different email
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: '#64748B' }}>Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: '#4A5568' }} />
                    <input
                      type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = ACC}
                      onBlur={e => e.target.style.borderColor = BDR}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || !email.trim()}
                  className="w-full py-3 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-50 mt-2"
                  style={{ background: ACC, color: BG }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-white"
            style={{ color: '#4A5568' }}>
            <ArrowLeft size={14} />Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
